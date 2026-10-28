<?php

namespace App\Http\Controllers;

use App\Services\TravellerSessions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminAccountController extends Controller
{
    private static function admin(Request $request): object
    {
        $traveller = TravellerSessions::resolve($request);
        abort_unless($traveller, 401, 'Sign in to continue.');
        abort_unless($traveller->is_admin && $traveller->status === 'active', 403, 'Admins only.');

        return $traveller;
    }

    private static function row(object $traveller): array
    {
        return ['id' => $traveller->id, 'name' => $traveller->name, 'email' => $traveller->email, 'type' => $traveller->type, 'status' => $traveller->status, 'is_admin' => (bool) $traveller->is_admin, 'organization_name' => $traveller->organization_name, 'phone' => $traveller->phone, 'created_at' => $traveller->created_at, 'approved_at' => $traveller->approved_at];
    }

    public function index(Request $request): JsonResponse
    {
        self::admin($request);
        $filters = $request->validate(['type' => ['nullable', Rule::in(TravellerSessions::TYPES)], 'status' => ['nullable', Rule::in(['active', 'pending', 'suspended'])], 'q' => ['nullable', 'string', 'max:100']]);
        $query = DB::table('travellers')->orderByRaw("case status when 'pending' then 0 else 1 end")->orderByDesc('id')->limit(200);
        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['q'])) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], strtolower($filters['q'])).'%';
            $query->where(fn ($q) => $q->whereRaw('lower(email) like ?', [$term])->orWhereRaw("lower(coalesce(name, '')) like ?", [$term])->orWhereRaw("lower(coalesce(organization_name, '')) like ?", [$term]));
        }
        $counts = DB::table('travellers')->selectRaw('type, status, count(*) as n')->groupBy('type', 'status')->get();

        return response()->json(['users' => $query->get()->map(fn (object $t): array => self::row($t)), 'counts' => $counts])->header('Cache-Control', 'no-store');
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $admin = self::admin($request);
        $input = $request->validate(['action' => ['required', Rule::in(['approve', 'suspend', 'reinstate', 'set_type', 'grant_admin', 'revoke_admin'])], 'type' => ['required_if:action,set_type', Rule::in(TravellerSessions::TYPES)]]);
        $target = DB::table('travellers')->find($id);
        abort_unless($target, 404, 'Account not found.');
        $self = (int) $target->id === (int) $admin->id;
        $changes = match ($input['action']) {
            'approve' => ['status' => 'active', 'approved_at' => now(), 'approved_by' => $admin->id],
            'suspend' => ['status' => 'suspended'],
            'reinstate' => ['status' => $target->type === 'customer' || $target->approved_at ? 'active' : 'pending'],
            'set_type' => ['type' => $input['type'], 'status' => $input['type'] === 'customer' ? 'active' : ($target->approved_at ? 'active' : 'pending'), 'organization_name' => $input['type'] === 'customer' ? null : ($target->organization_name ?: $target->name ?: 'Unnamed organisation')],
            'grant_admin' => ['is_admin' => true, 'status' => 'active'],
            'revoke_admin' => ['is_admin' => false],
        };
        abort_if($self && in_array($input['action'], ['suspend', 'revoke_admin'], true), 422, 'You cannot do that to your own account. Ask another admin.');
        abort_if($input['action'] === 'revoke_admin' && ! $target->is_admin, 422, 'That account is not an admin.');
        abort_if($input['action'] === 'revoke_admin' && DB::table('travellers')->where('is_admin', true)->where('status', 'active')->count() <= 1, 422, 'There must always be at least one active admin.');
        DB::transaction(function () use ($admin, $target, $input, $changes): void {
            DB::table('travellers')->where('id', $target->id)->update([...$changes, 'updated_at' => now()]);
            if (in_array($input['action'], ['suspend', 'revoke_admin', 'set_type'], true)) {
                TravellerSessions::revokeAll($target->id);
            }
            DB::table('admin_audit')->insert(['admin_id' => $admin->id, 'target_id' => $target->id, 'action' => $input['action'], 'detail' => json_encode(array_intersect_key($changes, array_flip(['type', 'status', 'is_admin']))), 'created_at' => now()]);
        });

        return response()->json(['user' => self::row(DB::table('travellers')->find($id))])->header('Cache-Control', 'no-store');
    }

    public function audit(Request $request): JsonResponse
    {
        self::admin($request);
        $rows = DB::table('admin_audit as a')->leftJoin('travellers as t', 't.id', '=', 'a.target_id')->leftJoin('travellers as u', 'u.id', '=', 'a.admin_id')->orderByDesc('a.id')->limit(50)->get(['a.id', 'a.action', 'a.detail', 'a.created_at', 't.email as target_email', 'u.email as admin_email']);

        return response()->json(['events' => $rows])->header('Cache-Control', 'no-store');
    }
}
