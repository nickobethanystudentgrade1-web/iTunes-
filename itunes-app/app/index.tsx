import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import {
  Feather,
} from '@expo/vector-icons';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { MUSIC_CONFIG } from '@/music.config';
import {
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
} from '@zip.js/zip.js';
import { useEffect, useMemo, useState } from 'react';

const HISTORY_KEY = '@itunes-apk/extraction-history';
type IconName = React.ComponentProps<typeof Feather>['name'];

function AppIcon({ name, ...props }: { name: IconName; size: number; color: string }) {
  return <Feather name={name} {...props} />;
}

type HistoryItem = {
  id: string;
  filename: string;
  count: number;
  date: string;
};

type PickedFile = {
  name: string;
  uri: string;
  size?: number;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)),
    );
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeEntryPath(filename: string) {
  const normalized = filename.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (
    normalized.startsWith('/') ||
    normalized.includes('\0') ||
    parts.some((part) => part === '..')
  ) {
    throw new Error(`Unsafe archive entry: ${filename}`);
  }
  return parts.join('/');
}

function formatBytes(bytes?: number) {
  if (!bytes) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [password, setPassword] = useState<string>(
    MUSIC_CONFIG.configuredArchivePassword,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusColor = error ? colors.destructive : colors.primary;
  const canExtract = Boolean(pickedFile && password && !isExtracting);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((stored) => {
        if (stored) setHistory(JSON.parse(stored) as HistoryItem[]);
      })
      .catch(() => undefined);
  }, []);

  const recentHistory = useMemo(() => history.slice(0, 3), [history]);

  async function chooseFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: [...MUSIC_CONFIG.supportedFileTypes],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPickedFile({ name: asset.name, uri: asset.uri, size: asset.size });
      setStatus(null);
      await Haptics.selectionAsync();
    }
  }

  async function extractFile() {
    if (!pickedFile) return;
    setIsExtracting(true);
    setError(null);
    setStatus('Reading archive…');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const encoded = await FileSystem.readAsStringAsync(pickedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const archiveBytes = base64ToBytes(encoded);
      const zipReader = new ZipReader(new Uint8ArrayReader(archiveBytes), {
        password,
      });
      const entries = await zipReader.getEntries();
      const archiveBase = pickedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^A-Za-z0-9._-]/g, '_');
      const outputDirectory = `${FileSystem.documentDirectory}${MUSIC_CONFIG.extractionDirectory}/${archiveBase}/`;
      await FileSystem.makeDirectoryAsync(outputDirectory, { intermediates: true });

      let extracted = 0;
      for (const entry of entries) {
        const entryPath = safeEntryPath(entry.filename);
        if (!entryPath || entry.directory) continue;
        setStatus(`Extracting ${extracted + 1} of ${entries.length}…`);
        const writer = new Uint8ArrayWriter();
        const data = await entry.getData(writer);
        const target = `${outputDirectory}${entryPath}`;
        const parent = target.slice(0, target.lastIndexOf('/') + 1);
        await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
        await FileSystem.writeAsStringAsync(target, bytesToBase64(data), {
          encoding: FileSystem.EncodingType.Base64,
        });
        extracted += 1;
      }
      await zipReader.close();

      const item: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename: pickedFile.name,
        count: extracted,
        date: new Date().toISOString(),
      };
      const nextHistory = [item, ...history].slice(0, 8);
      setHistory(nextHistory);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      setStatus(`Done. ${extracted} file${extracted === 1 ? '' : 's'} extracted.`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to open this archive.';
      setError(
        message.toLowerCase().includes('password') || message.toLowerCase().includes('decrypt')
          ? 'That password could not unlock this archive.'
          : message,
      );
      setStatus(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsExtracting(false);
    }
  }

  function clearSelectedFile() {
    setPickedFile(null);
    setStatus(null);
    setError(null);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={require('@/assets/images/itunes-icon.png')} style={styles.icon} />
              <View>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>LIBRARY UTILITY</Text>
                <Text style={[styles.brand, { color: colors.foreground }]}>{MUSIC_CONFIG.appName}</Text>
              </View>
            </View>
            <View style={[styles.securePill, { backgroundColor: colors.accent }]}>
              <AppIcon name="shield" size={14} color={colors.primary} />
              <Text style={[styles.secureText, { color: colors.accentForeground }]}>Private</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <Text style={[styles.title, { color: colors.foreground }]}>{MUSIC_CONFIG.tagline}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {MUSIC_CONFIG.description}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeading}>
              <View style={[styles.headingIcon, { backgroundColor: colors.accent }]}>
                <AppIcon name="archive" size={19} color={colors.primary} />
              </View>
              <View style={styles.headingCopy}>
                <Text style={[styles.cardTitle, { color: colors.cardForeground }]}>Choose a file</Text>
                <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
                  ZIP or APK, stored locally
                </Text>
              </View>
            </View>

            {pickedFile ? (
              <View style={[styles.selectedFile, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={[styles.fileIcon, { backgroundColor: colors.accent }]}>
                  <AppIcon name="file-text" size={20} color={colors.primary} />
                </View>
                <View style={styles.selectedCopy}>
                  <Text numberOfLines={1} style={[styles.selectedName, { color: colors.foreground }]}>
                    {pickedFile.name}
                  </Text>
                  <Text style={[styles.selectedMeta, { color: colors.mutedForeground }]}>
                    {formatBytes(pickedFile.size)}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Remove selected file"
                  hitSlop={12}
                  onPress={clearSelectedFile}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                >
                  <AppIcon name="x" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Choose ZIP or APK file"
                testID="choose-file"
                onPress={chooseFile}
                style={({ pressed }) => [
                  styles.dropZone,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.uploadCircle, { backgroundColor: colors.accent }]}>
                  <AppIcon name="upload-cloud" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.dropTitle, { color: colors.foreground }]}>Browse files</Text>
                <Text style={[styles.dropHint, { color: colors.mutedForeground }]}>
                  Tap to select from your device
                </Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeading}>
              <View style={[styles.headingIcon, { backgroundColor: colors.accent }]}>
                <AppIcon name="key" size={19} color={colors.primary} />
              </View>
              <View style={styles.headingCopy}>
                <Text style={[styles.cardTitle, { color: colors.cardForeground }]}>Archive password</Text>
                <Text style={[styles.cardDescription, { color: colors.mutedForeground }]}>
                  Required for protected files
                </Text>
              </View>
              <AppIcon name="lock" size={17} color={colors.mutedForeground} />
            </View>
            <View style={[styles.passwordRow, { borderColor: colors.input, backgroundColor: colors.muted }]}>
              <TextInput
                accessibilityLabel="Archive password"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="Enter archive password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                style={[styles.passwordInput, { color: colors.foreground }]}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((visible) => !visible)}
                style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
              >
                <Text style={[styles.revealText, { color: colors.primary }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.passwordNote}>
              <AppIcon name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
                Configured key loaded for this workspace
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Unlock and extract archive"
            testID="extract-file"
            disabled={!canExtract}
            onPress={extractFile}
            style={({ pressed }) => [
              styles.extractButton,
              { backgroundColor: canExtract ? colors.primary : colors.secondary },
              pressed && canExtract && styles.pressed,
            ]}
          >
            {isExtracting ? (
              <AppIcon name="refresh-cw" size={19} color={colors.primaryForeground} />
            ) : (
              <AppIcon name="lock" size={19} color={canExtract ? colors.primaryForeground : colors.mutedForeground} />
            )}
            <Text
              style={[
                styles.extractText,
                { color: canExtract ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {isExtracting ? 'Extracting…' : 'Unlock & extract'}
            </Text>
            {!isExtracting && canExtract ? (
              <AppIcon name="chevron-right" size={19} color={colors.primaryForeground} />
            ) : null}
          </Pressable>

          {status ? (
            <View style={[styles.feedback, { backgroundColor: colors.accent }]}>
              <AppIcon name="check-circle" size={17} color={statusColor} />
              <Text style={[styles.feedbackText, { color: statusColor }]}>{status}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={[styles.feedback, { backgroundColor: '#341829' }]}>
              <Text style={[styles.feedbackText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent extractions</Text>
            <AppIcon name="star" size={17} color={colors.primary} />
          </View>
          {recentHistory.length > 0 ? (
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {recentHistory.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyRow,
                    index < recentHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: colors.muted }]}>
                    <AppIcon name="folder" size={17} color={colors.primary} />
                  </View>
                  <View style={styles.historyCopy}>
                    <Text numberOfLines={1} style={[styles.historyName, { color: colors.foreground }]}>
                      {item.filename}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                      {item.count} files extracted
                    </Text>
                  </View>
                  <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                    {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { borderColor: colors.border }]}>
              <AppIcon name="music" size={20} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Your extraction history will appear here.
              </Text>
            </View>
          )}

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            Files stay on this device. Nothing is uploaded.
          </Text>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 14 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2 },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: -0.6 },
  securePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  secureText: { fontSize: 12, fontWeight: '600' },
  intro: { paddingTop: 16, paddingBottom: 6, gap: 6 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { maxWidth: 330, fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 16 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headingIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  headingCopy: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardDescription: { fontSize: 12, lineHeight: 17 },
  dropZone: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 17, alignItems: 'center', paddingVertical: 24, gap: 7 },
  uploadCircle: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  dropTitle: { fontSize: 15, fontWeight: '700' },
  dropHint: { fontSize: 12 },
  selectedFile: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  selectedCopy: { flex: 1, gap: 3 },
  selectedName: { fontSize: 14, fontWeight: '600' },
  selectedMeta: { fontSize: 12 },
  closeButton: { padding: 5 },
  passwordRow: { borderWidth: 1, borderRadius: 14, minHeight: 50, flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  passwordInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  revealButton: { paddingHorizontal: 14, paddingVertical: 12 },
  revealText: { fontSize: 12, fontWeight: '700' },
  passwordNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteText: { fontSize: 11 },
  extractButton: { minHeight: 56, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  extractText: { fontSize: 15, fontWeight: '700' },
  feedback: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  historyCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  historyRow: { minHeight: 70, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  historyCopy: { flex: 1, gap: 3 },
  historyName: { fontSize: 13, fontWeight: '600' },
  historyMeta: { fontSize: 11 },
  historyDate: { fontSize: 11 },
  emptyCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 18, padding: 22, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 12, textAlign: 'center' },
  footer: { textAlign: 'center', fontSize: 11, paddingTop: 2 },
  pressed: { opacity: 0.72 },
});