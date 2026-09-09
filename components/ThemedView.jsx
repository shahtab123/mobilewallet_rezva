import { View, type ViewProps } from 'react-native';
import { useColorScheme } from 'react-native';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor = '#ECEDEE',
  darkColor = '#151718',
  ...otherProps
}: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? darkColor : lightColor;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}