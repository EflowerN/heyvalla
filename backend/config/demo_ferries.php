<?php

return [
    'timezone' => 'Indian/Maldives',
    'transfer_minutes' => 20,
    'safety_minutes' => 30,
    'islands' => [
        'vilufushi' => 'Vilufushi',
        'veymandhoo' => 'Veymandhoo',
        'guraidhoo' => 'Guraidhoo',
    ],
    'sailings' => [
        ['id' => 'HV101', 'island' => 'vilufushi', 'departure' => '06:00', 'arrival' => '09:00', 'arrival_day' => 0, 'status' => 'scheduled'],
        ['id' => 'HV102', 'island' => 'vilufushi', 'departure' => '09:00', 'arrival' => '12:20', 'arrival_day' => 0, 'status' => 'scheduled'],
        ['id' => 'HV103', 'island' => 'vilufushi', 'departure' => '10:30', 'arrival' => '13:00', 'arrival_day' => 0, 'status' => 'scheduled'],
        ['id' => 'HV104', 'island' => 'vilufushi', 'departure' => '07:00', 'arrival' => '10:00', 'arrival_day' => 0, 'status' => 'cancelled'],
        ['id' => 'HV201', 'island' => 'veymandhoo', 'departure' => '08:00', 'arrival' => '09:00', 'arrival_day' => 0, 'status' => 'scheduled'],
        ['id' => 'HV202', 'island' => 'veymandhoo', 'departure' => '11:30', 'arrival' => '12:30', 'arrival_day' => 0, 'status' => 'scheduled'],
        ['id' => 'HV301', 'island' => 'guraidhoo', 'departure' => '05:30', 'arrival' => '07:30', 'arrival_day' => 0, 'status' => 'scheduled'],
        ['id' => 'HV302', 'island' => 'guraidhoo', 'departure' => '22:30', 'arrival' => '00:30', 'arrival_day' => 1, 'status' => 'scheduled'],
    ],
];
