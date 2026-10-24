<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FerrySearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'island' => ['required', 'string', Rule::in(array_column(config('locations.islands'), 'id'))],
            'airport' => ['required', 'string', Rule::in(array_column(config('locations.airports'), 'id'))],
            'flight_date' => ['required', 'date_format:Y-m-d'],
            'flight_time' => ['required', 'date_format:H:i'],
            'check_in_minutes' => ['required', 'integer', 'min:30', 'max:240'],
        ];
    }
}
