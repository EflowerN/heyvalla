<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class FerrySearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $flight = CarbonImmutable::createFromFormat('!Y-m-d H:i', $this->input('flight_date').' '.$this->input('flight_time'), 'Indian/Maldives');
            if (! $flight->isFuture()) {
                $validator->errors()->add('flight_date', 'Choose a future flight date and time.');
            }
        }];
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
