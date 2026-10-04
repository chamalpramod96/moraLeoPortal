import { useRef, useState } from 'react';
import { useAuth }              from '../context/AuthContext';
import { useToast }             from '../context/ToastContext';
import { uploadProfilePhoto }   from '../services/storageService';
import { updateMember }         from '../services/memberService';
import { isAllowedPhoto }       from '../utils/helpers';

/**
 * Shared hook for profile photo upload.
 * Attach `inputRef` to a hidden <input type="file">, call `openPicker()` on click.
 */
export function useProfilePhoto() {
  const { memberData, refreshMemberData } = useAuth();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!isAllowedPhoto(file)) {
      showToast('Please choose a JPG, PNG, WebP, GIF or HEIC photo.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProfilePhoto(memberData.email, file);
      await updateMember(memberData.email, { profilePhoto: url });
      refreshMemberData({ profilePhoto: url });
      showToast('Profile photo updated!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to upload photo. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const openPicker = () => !uploading && inputRef.current?.click();

  return { uploading, inputRef, handleChange, openPicker };
}
