import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { refreshAuthTokens, saveAuthTokens } from '../../services/auth/tokenStorage';

interface ReLoginModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ReLoginModal: React.FC<ReLoginModalProps> = ({
  visible,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const signInResponse = await GoogleSignin.signIn();

      if (signInResponse.type !== 'success' || !signInResponse.data) {
        console.log('Google sign-in did not complete successfully.', signInResponse);
        setLoading(false);
        return;
      }

      const { data } = signInResponse;

      // Update user info if needed
      if (data.user) {
        await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
      }

      // Save new tokens
      await saveAuthTokens({
        idToken: data.idToken,
        serverAuthCode: data.serverAuthCode,
      });

      // Force a refresh to ensure everything is synced
      try {
        await refreshAuthTokens();
      } catch (refreshError) {
        console.error('Failed to refresh tokens after re-login:', refreshError);
      }

      setLoading(false);
      onSuccess();
    } catch (error: any) {
      setLoading(false);
      console.error('Re-login Error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Info', 'Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available.');
      } else {
        Alert.alert('Error', `Failed to sign in: ${error.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-4">
        <View 
          className="w-full max-w-[350px] rounded-xl p-6 shadow-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <Text 
            className="mb-2 text-center text-lg font-bold"
            style={{ color: theme.text }}
          >
            {t('auth.sessionExpiredTitle', 'Session Expired')}
          </Text>
          
          <Text 
            className="mb-6 text-center text-sm"
            style={{ color: theme.subtext }}
          >
            {t('auth.sessionExpiredMessage', 'Your session has expired. Please sign in again to continue uploading your forms.')}
          </Text>

          <TouchableOpacity
            className="mb-3 w-full flex-row items-center justify-center rounded-lg p-3"
            style={{ backgroundColor: theme.buttonBackground }}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <>
                <Mail size={20} color={theme.buttonText} className="mr-2" />
                <Text className="font-semibold" style={{ color: theme.buttonText }}>
                  {t('login.signInWithGoogle', 'Sign in with Google')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full items-center p-3"
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={{ color: theme.subtext }}>
              {t('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
