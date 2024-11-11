import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'index', headerShown: false, }} />
      <Stack.Screen name="searchAddress" options={{ title: 'searchAddress', headerShown: false, }} />
    </Stack>
  );
}
