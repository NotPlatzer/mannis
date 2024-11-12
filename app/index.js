import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as SQLite from 'expo-sqlite/legacy';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import Constants from "expo-constants";
import SearchSvg from '../assets/search-alt-1-svgrepo-com.svg'
import { useRouter, useLocalSearchParams } from "expo-router";

const mannisLocation = [11.158797, 46.665481]

export default function Index() {
  const router = useRouter();
  const { addresses } = useLocalSearchParams();
  const [locations, setLocations] = useState([]);
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState({})
  const [route, setRoute] = useState({})

  const initialRegionSet = useRef(false);

  function decodePolyline(encoded) {
    let points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        
        let deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += deltaLat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        
        let deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += deltaLng;

        points.push({latitude: lat / 1e5, longitude: lng / 1e5});
    }
    return points;
}

  const loadDatabase = async () => {
    const dbUri = `${FileSystem.documentDirectory}SQLite/OSM_data.db`;

    try {
      const dbExists = await FileSystem.getInfoAsync(dbUri);
      const haveToDelete = false;
      if (dbExists.exists && haveToDelete) {
        await FileSystem.deleteAsync(dbUri, { idempotent: true });
        console.log("Existing database deleted.");
      }

      const asset = Asset.fromModule(require('../assets/OSM_data.db'));
      await asset.downloadAsync();
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true });
      await FileSystem.copyAsync({
        from: asset.localUri,
        to: dbUri,
      });
    } catch (error) {
      console.error("Error setting up database:", error);
    }
  };

  const userLocationChange = (location) => {
    setUserLocation(location)
    if (!initialRegionSet.current) {
      setRegion({
        ...region,
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude
      })
      initialRegionSet.current = true
    }
  }

  useEffect(() => {
    loadDatabase();
  }, []);

  useEffect(() => {
    loadDatabase();
    if (addresses) {
      try {
        const parsedAddress = JSON.parse(addresses)
        setLocations(parsedAddress);
        //getDirections(parsedAddress)
        getOptimisation(parsedAddress)
      } catch (error) {
        console.error("Failed to parse address:", error);
      }
    }
  }, [addresses]);


  const getDirections = (c) => {
    const apiUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';
    const data = {
      coordinates: c
    };

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': '5b3ce3597851110001cf624865218d6b2b804a69bde78e798286446f' // Corrected spelling here
      },
      body: JSON.stringify(data),
    };

    fetch(apiUrl, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json(); // Parse JSON data to handle it
      })
      .then(data => {
        setRoute({coordinates: decodePolyline(data.routes[0].geometry), summary: data.routes[0].summary})
      })
      .catch(error => {
        console.error('Error:', error); // Log any errors
      });
};

  const getOptimisation = (parsedAddress) => {
    const apiUrl = 'https://api.openrouteservice.org/optimization';
    let deliverys = parsedAddress.map(({ lat, lon }) => [lon, lat])
    const userCoordinates = [userLocation.coordinate.longitude, userLocation.coordinate.latitude];

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
      start: userCoordinates,            // Vehicle starting point
      end: mannisLocation,              // Vehicle ending point
      capacity: [4],                  // Capacity array, adjust as needed
      skills: [1],                    // Vehicle skills, adjust as necessary
    };
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': '5b3ce3597851110001cf624865218d6b2b804a69bde78e798286446f' // Corrected spelling here
      },
      body: JSON.stringify({
        jobs: jobs,
        vehicles: [vehicle]
      }),
    };

    fetch(apiUrl, requestOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json(); // Parse JSON data to handle it
      })
      .then(data => {
        setLocations(data.routes[0].steps.map(step => step.location))
        getDirections(data.routes[0].steps.map(step => step.location))
      })
      .catch(error => {
        console.error('Error:', error); // Log any errors
      });
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.searchContainer} onPress={() => { router.navigate({ pathname: '/searchAddress' }) }}>
        <SearchSvg width={40} height={40} />
      </TouchableOpacity>
      {locations && locations.length > 0 && <TouchableOpacity style={styles.clearContainer} onPress={() => { setLocations([]); setRoute({}) }}>
        <Text style={{ fontSize: 18 }}>Clear</Text>
      </TouchableOpacity>}
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsTraffic={true}
        showsPointsOfInterest={false}
        onUserLocationChange={e => { userLocationChange(e.nativeEvent) }}
      >
        {locations && locations.map((item, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: item.lat,
              longitude: item.lon,
            }}

            title={item.street}
            description={`Number: ${item.housenumber}`}
          />
        ))}
        {route && <Polyline
        coordinates={route.coordinates}
        strokeColor="#000" // fallback for when `strokeColors` is not supported by the map-provider
        strokeColors={[
          '#007F00'
        ]}
        strokeWidth={3}
        />}
      </MapView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 100, // Make it circular
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 2
  },
  clearContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 100, // Make it circular
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 2
  },
});
