import { Redirect, useLocalSearchParams } from 'expo-router';

export default function UnitHistoryRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/(app)/history', params: { unitId: id } }} />;
}
