import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

// This is a redirect route - when the deep link budgetplanner://quick-add is opened,
// this route will be loaded and immediately redirect to the home screen where the
// QuickAddModal will be opened via URL parameter
export default function QuickAddRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home with quick-add parameter
    router.replace('/(tabs)/?openQuickAdd=true');
  }, []);

  return <View />;
}
