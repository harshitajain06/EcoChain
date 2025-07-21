export default async function estimateCarbonFromActivity(title, category) {
  const response = await fetch('https://api.climatiq.io/estimate', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer JWEW3X0ZCS5435AVZDFJAXC1MR',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      emission_factor: {
        activity_id: 'passenger_vehicle-vehicle_type_car-fuel_source_na-distance_na-engine_size_na',
        data_version: '23.23' // ✅ required
      },
      parameters: {
        distance: 5,
        distance_unit: 'km',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Climatiq API Error:', response.status, errorText);
    throw new Error('Failed to estimate carbon');
  }

  const data = await response.json();
  return data.co2e || 0;
}
