import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Button } from 'react-native';
import * as SQLite from 'expo-sqlite/legacy';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Constants from "expo-constants";
import { useRouter } from "expo-router";

export default function SearchAddresses() {
    const router = useRouter();
    const [addresses, setAddresses] = useState([]);
    const [streets, setStreets] = useState([]);
    const [selectedStreet, setSelectedStreet] = useState(null);
    const [inputText, setInputText] = useState('');
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [selectedAddresses, setSelectedAddresses] = useState([]);

    const getStreets = () => {
        const db = SQLite.openDatabase("OSM_data.db");
        db.transaction(tx => {
            let query = `SELECT * FROM fts_streets WHERE name MATCH ?`;
            const queryParams = [`${inputText}*`];
            tx.executeSql(
                query,
                queryParams,
                (_, { rows }) => {
                    setStreets(rows._array);
                },
                (tx, error) => console.error("Error loading data from 'fts_streets':", error)
            );
        });
    };

    const getHouseNumber = () => {
        const db = SQLite.openDatabase("OSM_data.db");
        db.transaction(tx => {
            let query = `SELECT * FROM fts_addresses WHERE street = ? and housenumber MATCH ?`;
            const queryParams = [selectedStreet.name, `${inputText}*`];
            tx.executeSql(
                query,
                queryParams,
                (_, { rows }) => {
                    setAddresses(rows._array);
                },
                (tx, error) => console.error("Error loading data from 'fts_addresses':", error)
            );
        });
    };

    const loadDatabase = async () => {
        const dbUri = `${FileSystem.documentDirectory}SQLite/OSM_data.db`;
        const dbExists = await FileSystem.getInfoAsync(dbUri);

        if (!dbExists.exists) {
            const asset = Asset.fromModule(require('../assets/OSM_data.db'));
            await asset.downloadAsync();
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true });
            await FileSystem.copyAsync({
                from: asset.localUri,
                to: dbUri,
            });
            console.log("Database copied successfully.");
        }
    };

    useEffect(() => {
        loadDatabase();
    }, []);

    useEffect(() => {
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        setTypingTimeout(
            setTimeout(() => {
                if (inputText) {
                    console.log("User stopped typing, execute search:", inputText);
                    if (selectedStreet) {
                        getHouseNumber();
                    } else {
                        getStreets();
                    }
                }
                else {
                    setAddresses([]);
                    setStreets([]);
                }
            }, 500)
        );
        return () => clearTimeout(typingTimeout);
    }, [inputText]);

    const handleStreetSelection = (street) => {
        setSelectedStreet(street);
        setInputText(''); // Clear the TextInput for house number input
    };

    const handleAddressSelection = (address) => {
        setSelectedAddresses([...selectedAddresses, address]);
        setSelectedStreet(null); // Reset to allow adding another address
        setInputText(''); // Clear the TextInput for next address
    };

    const handleFinish = () => {
        // Navigate to the home route with the selected addresses
        router.navigate({ pathname: '/', params: { addresses: JSON.stringify(selectedAddresses) } });
    };

    return (
        <View style={styles.container}>
            {selectedStreet && (
                <Text style={styles.selectedStreetLabel}>
                    Selected Street: {selectedStreet.name}
                </Text>
            )}
            <TextInput
                style={styles.input}
                placeholder={selectedStreet ? "Enter house number..." : "Search for an address..."}
                value={inputText}
                onChangeText={setInputText}
            />
            <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
                {!selectedStreet && streets.length > 0 && streets.map((street, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.addressItem}
                        onPress={() => handleStreetSelection(street)}
                    >
                        <Text style={styles.streetName}>{street.name}</Text>
                        <Text style={styles.streetDetails}>
                            {street.city ? street.city : ''}
                            {street.city && street.postcode ? ', ' : ''}
                            {street.postcode ? street.postcode : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
                {selectedStreet && addresses.length > 0 && addresses.map((address, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.addressItem}
                        onPress={() => handleAddressSelection(address)}
                    >
                        <Text style={styles.streetName}>{address.street} {address.housenumber}</Text>
                        <Text style={styles.streetDetails}>
                            {address.city ? address.city : ''}
                            {address.city && address.postcode ? ', ' : ''}
                            {address.postcode ? address.postcode : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {selectedAddresses.length > 0 && (
                <View style={styles.finishContainer}>
                    <Text style={styles.selectedAddressesTitle}>Selected Addresses:</Text>
                    {selectedAddresses.map((address, index) => (
                        <Text key={index} style={styles.selectedAddressText}>
                            {address.street} {address.housenumber}, {address.city}, {address.postcode}
                        </Text>
                    ))}
                    <Button title="Finish and Send" onPress={handleFinish} />
                </View>
            )}
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: Constants.statusBarHeight * 1.3,
        backgroundColor: '#f9f9f9',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        fontSize: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        marginBottom: 10,
    },
    listContainer: {
        flex: 1,
        marginTop: 10,
    },
    listContent: {
        paddingBottom: 20,
    },
    addressItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: '#fff',
    },
    streetName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    streetDetails: {
        fontSize: 14,
        color: '#555',
        marginTop: 2,
    },
    selectedStreetLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#555',
    },
    finishContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    selectedAddressesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    selectedAddressText: {
        fontSize: 14,
        color: '#333',
        marginVertical: 2,
    },
});
