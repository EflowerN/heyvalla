<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountTypesTest extends TestCase
{
    use RefreshDatabase;

    private function signUp(string $email, array $extra = []): array
    {
        $this->flushHeaders();
        $response = $this->postJson('/api/v1/travellers/register', ['email' => $email, 'password' => 'correct horse battery', 'name' => Str::before($email, '@'), ...$extra]);

        return ['response' => $response, 'token' => $response->json('token'), 'id' => (int) DB::table('travellers')->where('email', $email)->value('id')];
    }

    private function admin(string $email = 'admin@example.test'): array
    {
        $account = $this->signUp($email);
        $this->artisan('accounts:make-admin', ['email' => $email])->assertSuccessful();
        $this->flushHeaders();
        $login = $this->postJson('/api/v1/travellers/login', ['email' => $email, 'password' => 'correct horse battery'])->assertOk();

        return [...$account, 'token' => $login->json('token')];
    }

    private function as(string $token)
    {
        $this->flushHeaders();

        return $this->withToken($token);
    }

    public function test_customers_start_active_and_owners_and_businesses_start_pending(): void
    {
        $this->signUp('customer@example.test')['response']->assertCreated()->assertJsonPath('account.status', 'active');
        foreach (['vessel_owner', 'vehicle_owner', 'business'] as $type) {
            $this->signUp("$type@example.test", ['type' => $type, 'organization_name' => 'Demo Co'])['response']->assertCreated()->assertJsonPath('account.type', $type)->assertJsonPath('account.status', 'pending')->assertJsonPath('account.organization_name', 'Demo Co');
        }
    }

    public function test_owners_and_businesses_must_name_their_organisation_and_admin_is_never_selectable(): void
    {
        $this->signUp('a@example.test', ['type' => 'vessel_owner'])['response']->assertUnprocessable()->assertJsonValidationErrors('organization_name');
        $this->signUp('b@example.test', ['type' => 'admin'])['response']->assertUnprocessable()->assertJsonValidationErrors('type');
        $this->signUp('c@example.test', ['is_admin' => true, 'status' => 'active', 'type' => 'business', 'organization_name' => 'X'])['response']->assertCreated()->assertJsonPath('account.is_admin', false)->assertJsonPath('account.status', 'pending');
    }

    public function test_make_admin_only_works_for_existing_accounts_and_the_last_admin_cannot_be_removed(): void
    {
        $this->artisan('accounts:make-admin', ['email' => 'ghost@example.test'])->assertFailed();
        $admin = $this->admin();
        $this->assertTrue((bool) DB::table('travellers')->find($admin['id'])->is_admin);
        $this->artisan('accounts:make-admin', ['email' => 'admin@example.test', '--revoke' => true])->assertFailed();
        $this->admin('second@example.test');
        $this->artisan('accounts:make-admin', ['email' => 'admin@example.test', '--revoke' => true])->assertSuccessful();
        $this->assertFalse((bool) DB::table('travellers')->find($admin['id'])->is_admin);
    }

    public function test_admin_pages_are_closed_to_everyone_else(): void
    {
        $customer = $this->signUp('customer@example.test');
        $this->flushHeaders();
        $this->getJson('/api/v1/admin/users')->assertUnauthorized();
        $this->as($customer['token'])->getJson('/api/v1/admin/users')->assertForbidden();
        $this->as($customer['token'])->postJson('/api/v1/admin/users/'.$customer['id'], ['action' => 'grant_admin'])->assertForbidden();
        $this->as($customer['token'])->getJson('/api/v1/admin/audit')->assertForbidden();
        $this->assertFalse((bool) DB::table('travellers')->find($customer['id'])->is_admin);
    }

    public function test_admins_list_filter_and_search_accounts(): void
    {
        $admin = $this->admin();
        $this->signUp('boat@example.test', ['type' => 'vessel_owner', 'organization_name' => 'Lagoon Launches']);
        $this->signUp('plain@example.test');
        $list = $this->as($admin['token'])->getJson('/api/v1/admin/users')->assertOk();
        $this->assertSame('pending', $list->json('users.0.status'), 'pending accounts are listed first');
        $this->assertCount(1, $this->as($admin['token'])->getJson('/api/v1/admin/users?status=pending')->json('users'));
        $this->assertCount(1, $this->as($admin['token'])->getJson('/api/v1/admin/users?type=customer&q=plain')->json('users'));
        $this->assertCount(1, $this->as($admin['token'])->getJson('/api/v1/admin/users?q=lagoon')->json('users'));
        $this->assertCount(0, $this->as($admin['token'])->getJson('/api/v1/admin/users?q=%25')->json('users'), 'wildcards in the search are not interpreted');
        $this->as($admin['token'])->getJson('/api/v1/admin/users?type=pirate')->assertUnprocessable();
        $this->as($admin['token'])->getJson('/api/v1/admin/users')->assertJsonMissingPath('users.0.password');
    }

    public function test_approving_activates_an_owner_and_is_recorded_in_the_audit_trail(): void
    {
        $admin = $this->admin();
        $owner = $this->signUp('boat@example.test', ['type' => 'vessel_owner', 'organization_name' => 'Lagoon Launches']);
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$owner['id'], ['action' => 'approve'])->assertOk()->assertJsonPath('user.status', 'active');
        $row = DB::table('travellers')->find($owner['id']);
        $this->assertNotNull($row->approved_at);
        $this->assertSame($admin['id'], (int) $row->approved_by);
        $audit = $this->as($admin['token'])->getJson('/api/v1/admin/audit')->assertOk();
        $this->assertSame('approve', $audit->json('events.0.action'));
        $this->assertSame('boat@example.test', $audit->json('events.0.target_email'));
        $this->assertSame('admin@example.test', $audit->json('events.0.admin_email'));
    }

    public function test_suspending_signs_the_person_out_everywhere_and_blocks_login_until_reinstated(): void
    {
        $admin = $this->admin();
        $customer = $this->signUp('customer@example.test');
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$customer['id'], ['action' => 'suspend'])->assertOk()->assertJsonPath('user.status', 'suspended');
        $this->as($customer['token'])->getJson('/api/v1/travellers/me')->assertJsonPath('account', null);
        $this->flushHeaders();
        $this->postJson('/api/v1/travellers/login', ['email' => 'customer@example.test', 'password' => 'correct horse battery'])->assertForbidden();
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$customer['id'], ['action' => 'reinstate'])->assertOk()->assertJsonPath('user.status', 'active');
        $this->flushHeaders();
        $this->postJson('/api/v1/travellers/login', ['email' => 'customer@example.test', 'password' => 'correct horse battery'])->assertOk();
    }

    public function test_an_unapproved_owner_is_not_reinstated_straight_to_active(): void
    {
        $admin = $this->admin();
        $owner = $this->signUp('boat@example.test', ['type' => 'vessel_owner', 'organization_name' => 'Lagoon']);
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$owner['id'], ['action' => 'suspend'])->assertOk();
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$owner['id'], ['action' => 'reinstate'])->assertOk()->assertJsonPath('user.status', 'pending');
    }

    public function test_admins_cannot_lock_themselves_out_or_remove_the_last_admin(): void
    {
        $admin = $this->admin();
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$admin['id'], ['action' => 'suspend'])->assertUnprocessable();
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$admin['id'], ['action' => 'revoke_admin'])->assertUnprocessable();
        $second = $this->admin('second@example.test');
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$second['id'], ['action' => 'revoke_admin'])->assertOk()->assertJsonPath('user.is_admin', false);
        $this->as($second['token'])->getJson('/api/v1/travellers/me')->assertJsonPath('account', null);
        $this->as($admin['token'])->postJson('/api/v1/admin/users/999', ['action' => 'approve'])->assertNotFound();
    }

    public function test_changing_type_validates_input_and_requires_approval_for_new_owner_types(): void
    {
        $admin = $this->admin();
        $customer = $this->signUp('customer@example.test');
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$customer['id'], ['action' => 'set_type', 'type' => 'admin'])->assertUnprocessable();
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$customer['id'], ['action' => 'set_type', 'type' => 'business'])->assertOk()->assertJsonPath('user.type', 'business')->assertJsonPath('user.status', 'pending');
    }

    public function test_only_an_approved_vessel_owner_reaches_boat_owner_tools_with_their_own_session(): void
    {
        $admin = $this->admin();
        $owner = $this->signUp('boat@example.test', ['type' => 'vessel_owner', 'organization_name' => 'Lagoon Launches', 'name' => 'Ali']);
        $this->as($owner['token'])->getJson('/api/v1/providers/account')->assertForbidden()->assertJsonPath('message', 'Your boat owner account is waiting for approval by our team.');
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$owner['id'], ['action' => 'approve'])->assertOk();
        $this->as($owner['token'])->getJson('/api/v1/providers/account')->assertOk()->assertJsonPath('account.organization_name', 'Lagoon Launches');
        $this->as($owner['token'])->postJson('/api/v1/providers/vessels', ['name' => 'Lagoon One', 'passenger_capacity' => 12, 'booking_mode' => 'off', 'cargo_enquiries' => false])->assertOk();
        $this->assertSame(1, DB::table('provider_accounts')->where('traveller_id', $owner['id'])->count());
        // Customers, vehicle owners and businesses do not get boat tools even when approved.
        foreach (['customer' => [], 'vehicle_owner' => ['type' => 'vehicle_owner', 'organization_name' => 'Taxi Co'], 'business' => ['type' => 'business', 'organization_name' => 'Resort Co']] as $label => $extra) {
            $other = $this->signUp("$label@example.test", $extra);
            $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$other['id'], ['action' => 'approve'])->assertOk();
            $this->as($other['token'])->getJson('/api/v1/providers/account')->assertForbidden();
        }
    }

    public function test_a_new_account_cannot_adopt_an_existing_boat_profile_with_the_same_email(): void
    {
        DB::table('provider_accounts')->insert(['owner_name' => 'Original', 'email' => 'boat@example.test', 'password' => 'x', 'organization_name' => 'Original Launches', 'created_at' => now(), 'updated_at' => now()]);
        $admin = $this->admin();
        $owner = $this->signUp('boat@example.test', ['type' => 'vessel_owner', 'organization_name' => 'Copycat']);
        $this->as($admin['token'])->postJson('/api/v1/admin/users/'.$owner['id'], ['action' => 'approve'])->assertOk();
        $this->as($owner['token'])->getJson('/api/v1/providers/account')->assertStatus(409);
        $this->assertSame('Original Launches', DB::table('provider_accounts')->where('email', 'boat@example.test')->value('organization_name'));
    }

    public function test_boat_owner_self_registration_can_be_switched_off(): void
    {
        $body = ['owner_name' => 'Demo Owner', 'organization_name' => 'Demo Launch', 'email' => 'owner@example.test', 'password' => 'fictional-test-password', 'password_confirmation' => 'fictional-test-password'];
        $this->flushHeaders();
        $this->postJson('/api/v1/providers/register', $body)->assertCreated();
        config(['accounts.provider_self_registration' => false]);
        $this->postJson('/api/v1/providers/register', [...$body, 'email' => 'other@example.test'])->assertForbidden();
    }
}
