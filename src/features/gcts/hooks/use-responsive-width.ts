import { useWindowDimensions } from 'react-native';

export function useResponsiveWidth() {
  return useWindowDimensions().width;
}
