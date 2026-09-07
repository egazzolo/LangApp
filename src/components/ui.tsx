import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, type ImageSourcePropType, type TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
export function Screen({ children }: PropsWithChildren) { return <View style={styles.screen}>{children}</View>; }
export function Button({ label, onPress, disabled, loading, variant = 'primary' }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: 'primary' | 'secondary' | 'ghost' }) { return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, styles[variant], pressed && { opacity: .8 }, (disabled || loading) && { opacity: .5 }]}>{loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} /> : <Text style={[styles.buttonText, variant !== 'primary' && { color: colors.primary }]}>{label}</Text>}</Pressable>; }
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: spacing.sm }}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#9A958D" style={styles.input} {...props} /></View>; }
const bundledAvatars: Record<string, ImageSourcePropType> = {
  // Keep this legacy key so existing locally saved Fersons continue to render.
  'person-sarah': require('../../assets/avatars/avatar-woman-01.png'),
  'avatar-woman-01': require('../../assets/avatars/avatar-woman-01.png'),
  'avatar-woman-02': require('../../assets/avatars/avatar-woman-02.png'),
  'avatar-woman-03': require('../../assets/avatars/avatar-woman-03.png'),
  'avatar-man-01': require('../../assets/avatars/avatar-man-01.png'),
  'avatar-man-02': require('../../assets/avatars/avatar-man-02.png'),
  'pet-golden': require('../../assets/avatars/pet-golden.png'),
  'place-lake': require('../../assets/avatars/place-lake.png'),
};
export function Avatar({ name, size = 52, avatarUrl }: { name: string; size?: number; avatarUrl?: string }) { const source = avatarUrl ? bundledAvatars[avatarUrl] ?? { uri: avatarUrl } : undefined; return <View accessibilityLabel={`${name} avatar`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>{source ? <Image source={source} style={styles.avatarImage}/> : <Text style={[styles.avatarText, { fontSize: size * .34 }]}>{name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</Text>}</View>; }
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.canvas }, button: { minHeight: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }, primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.primarySoft }, ghost: { backgroundColor: 'transparent' }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }, label: { color: colors.ink, fontSize: 14, fontWeight: '600' }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: spacing.md, fontSize: 16 }, avatar: { backgroundColor: '#D8A07A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: '#fff', fontWeight: '700' } });



