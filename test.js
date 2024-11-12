const request = require('request');

const deliverys = [
    [11.1627272, 46.6666934],
    [11.1668508, 46.6581182]
];
const userLocation = [11.154578873322324, 46.6797800526044];
const endlocations = [11.158797, 46.665481];

// Mapping delivery coordinates to job objects for VROOM
const jobs = deliverys.map((location, index) => ({
    id: index + 1,                 // Unique job ID
    location: location,             // Coordinates of the delivery
    service: 90,                   // Service duration in seconds
    delivery: [1],                  // Delivery quantity (could be capacity metric if needed)
    skills: [1],                    // Example skill, adjust as needed
}));

// Defining the vehicle with start and end locations
const vehicle = {
    id: 1,
    profile: "driving-car",                 // Profile for routing, "car" by default
    start: userLocation,            // Vehicle starting point
    end: endlocations,              // Vehicle ending point
    capacity: [4],                  // Capacity array, adjust as needed
    skills: [1],                    // Vehicle skills, adjust as necessary
};

// Sending the request to the VROOM API
request({
    method: 'POST',
    url: 'https://api.openrouteservice.org/optimization',  // Replace with the correct VROOM API endpoint
    body: JSON.stringify({
        jobs: jobs,
        vehicles: [vehicle]
    }),
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': '5b3ce3597851110001cf624865218d6b2b804a69bde78e798286446f'
    }
}, function (error, response, body) {
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Status:', response.statusCode);
        console.log('Response:', body);
    }
});
