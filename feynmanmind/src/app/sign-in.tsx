import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, InlineError, Screen, TextField } from '@/components/ui';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

type Mode = 'signIn' | 'signUp' | 'code';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const t = useT();
  const styles = useStyles();
  const { colors, typography } = useTheme();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cleanEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(cleanEmail);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = () =>
    run(async () => {
      if (!emailValid) throw { code: 'validation_failed' };
      if (mode === 'signUp') {
        if (password.length < 8) throw { code: 'weak_password' };
        const { data, error: e } = await supabase.auth.signUp({ email: cleanEmail, password });
        if (e) throw e;
        // With "Confirm email" on, there is no session until the link is clicked.
        if (!data.session) {
          setNotice(t('auth.checkInbox'));
          setMode('signIn');
        }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (e) throw e;
      }
      // On success the auth listener swaps the navigator to the app.
    });

  const sendCode = () =>
    run(async () => {
      if (!emailValid) throw { code: 'validation_failed' };
      const { error: e } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: true } });
      if (e) throw e;
      setCodeSent(true);
      setNotice(t('auth.codeSent', { email: cleanEmail }));
    });

  const verifyCode = () =>
    run(async () => {
      const { error: e } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code.trim(), type: 'email' });
      if (e) throw e;
    });

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setCodeSent(false);
    setCode('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']} contentStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="bulb" size={36} color={colors.onPrimary} />
          </View>
          <Text style={typography.title}>FeynmanMind</Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>{t('auth.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            inputMode="email"
            editable={!codeSent}
          />

          {mode !== 'code' ? (
            <TextField
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
              onSubmitEditing={submitPassword}
              footer={mode === 'signUp' ? t('auth.passwordTooShort') : undefined}
            />
          ) : codeSent ? (
            <TextField
              label={t('auth.code')}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              onSubmitEditing={verifyCode}
            />
          ) : null}

          {notice ? <Text style={[typography.caption, { color: colors.success }]} accessibilityLiveRegion="polite">{notice}</Text> : null}
          <InlineError message={error} />

          {mode === 'code' ? (
            codeSent ? (
              <>
                <Button label={t('auth.verifyCode')} onPress={verifyCode} loading={busy} disabled={code.length !== 6} />
                <Button label={t('auth.resendCode')} variant="ghost" onPress={sendCode} disabled={busy} />
              </>
            ) : (
              <Button label={t('auth.sendCode')} onPress={sendCode} loading={busy} disabled={!email} />
            )
          ) : (
            <Button
              label={mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')}
              onPress={submitPassword}
              loading={busy}
              disabled={!email || !password}
            />
          )}
        </View>

        <View style={styles.links}>
          {mode === 'signIn' ? <Button label={t('auth.switchToSignUp')} variant="ghost" onPress={() => switchMode('signUp')} /> : null}
          {mode === 'signUp' ? <Button label={t('auth.switchToSignIn')} variant="ghost" onPress={() => switchMode('signIn')} /> : null}
          {mode === 'code' ? (
            <Button label={t('auth.usePassword')} variant="ghost" onPress={() => switchMode('signIn')} />
          ) : (
            <Button label={t('auth.useCode')} variant="ghost" onPress={() => switchMode('code')} />
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { flexGrow: 1, justifyContent: 'center', maxWidth: 440, width: '100%', alignSelf: 'center', gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  form: { gap: spacing.md },
  links: { gap: spacing.xs },
}));
