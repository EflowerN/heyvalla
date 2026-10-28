<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class TravellerAccountTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $extra = [], ?string $guest = null)
    {
        $request = $guest ? $this->withHeader('X-Demo-Guest', $guest) : $this;

        return $request->postJson('/api/v1/travellers/register', ['name' => 'Aishath', 'email' => 'Aishath@Example.test', 'password' => 'correct horse battery', ...$extra]);
    }

    public function test_registration_hashes_the_password_normalises_email_and_hides_secrets(): void
    {
        $response = $this->register()->assertCreated()->assertJsonPath('account.email', 'aishath@example.test')->assertJsonPath('account.name', 'Aishath')->assertJsonPath('account.type', 'customer')->assertJsonPath('account.status', 'active')->assertJsonPath('account.is_admin', false)->assertJsonMissingPath('account.password')->assertHeader('Cache-Control', 'no-store, private');
        $this->assertTrue(Str::isUuid($response->json('guest')));
        $this->assertSame(64, strlen($response->json('token')));
        $this->assertNotSame('correct horse battery', DB::table('travellers')->first()->password);
        $this->assertNotSame($response->json('token'), DB::table('traveller_sessions')->first()->token_hash);
    }

    public function test_passwords_need_ten_characters_and_a_real_email(): void
    {
        $this->register(['password' => 'short'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->register(['email' => 'not-an-email'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame(0, DB::table('travellers')->count());
    }

    public function test_existing_guest_trips_carry_over_unless_the_guest_already_belongs_to_an_account(): void
    {
        $guest = (string) Str::uuid();
        $this->register([], $guest)->assertCreated()->assertJsonPath('guest', $guest);
        $second = $this->register(['email' => 'other@example.test'], $guest)->assertCreated();
        $this->assertNotSame($guest, $second->json('guest'));
        $this->assertSame(2, DB::table('travellers')->distinct()->count('guest_uuid'));
    }

    public function test_duplicate_email_gets_a_generic_message_that_does_not_confirm_the_account(): void
    {
        $this->register()->assertCreated();
        $this->register()->assertUnprocessable()->assertJsonPath('message', 'We could not create an account with those details. Try signing in instead.');
        $this->assertSame(1, DB::table('travellers')->count());
    }

    public function test_login_returns_the_same_guest_identity_and_rejects_bad_credentials_identically(): void
    {
        $guest = $this->register()->json('guest');
        $this->postJson('/api/v1/travellers/login', ['email' => ' AISHATH@example.test ', 'password' => 'correct horse battery'])->assertOk()->assertJsonPath('guest', $guest)->assertJsonPath('account.name', 'Aishath');
        $wrong = $this->postJson('/api/v1/travellers/login', ['email' => 'aishath@example.test', 'password' => 'wrong password here'])->assertUnauthorized()->json('message');
        $unknown = $this->postJson('/api/v1/travellers/login', ['email' => 'nobody@example.test', 'password' => 'wrong password here'])->assertUnauthorized()->json('message');
        $this->assertSame($wrong, $unknown);
    }

    public function test_me_needs_a_valid_session_token_and_logout_revokes_it(): void
    {
        $token = $this->register()->json('token');
        $this->withToken($token)->getJson('/api/v1/travellers/me')->assertOk()->assertJsonPath('account.email', 'aishath@example.test');
        $this->flushHeaders();
        $this->getJson('/api/v1/travellers/me')->assertOk()->assertJsonPath('account', null);
        $this->withToken(Str::random(64))->getJson('/api/v1/travellers/me')->assertOk()->assertJsonPath('account', null);
        // The guest cookie alone no longer proves who someone is.
        $this->flushHeaders();
        $guest = DB::table('travellers')->value('guest_uuid');
        $this->withHeader('X-Demo-Guest', $guest)->getJson('/api/v1/travellers/me')->assertOk()->assertJsonPath('account', null);
        $this->flushHeaders();
        $this->withToken($token)->postJson('/api/v1/travellers/logout')->assertOk();
        $this->withToken($token)->getJson('/api/v1/travellers/me')->assertOk()->assertJsonPath('account', null);
    }

    public function test_sessions_expire_after_a_week(): void
    {
        $token = $this->register()->json('token');
        $this->travel(6)->days();
        $this->withToken($token)->getJson('/api/v1/travellers/me')->assertJsonPath('account.email', 'aishath@example.test');
        $this->travel(2)->days();
        $this->withToken($token)->getJson('/api/v1/travellers/me')->assertJsonPath('account', null);
    }

    /** The limit is five attempts per email a minute, and registration counts as the first. */
    public function test_repeated_wrong_passwords_are_rate_limited(): void
    {
        $this->register()->assertCreated();
        foreach (range(1, 4) as $_) {
            $this->postJson('/api/v1/travellers/login', ['email' => 'aishath@example.test', 'password' => 'wrong password here'])->assertUnauthorized();
        }
        $this->postJson('/api/v1/travellers/login', ['email' => 'aishath@example.test', 'password' => 'correct horse battery'])->assertStatus(429);
    }
}
