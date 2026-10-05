import { useAuth }          from '../context/AuthContext';
import { useProfilePhoto }  from '../hooks/useProfilePhoto';
import { InlineSpinner }    from './LoadingSpinner';
import { PHOTO_ACCEPT }     from '../utils/helpers';

const SIZES = {
  md: { box: 'w-16 h-16', border: 'border-portal-gold/40', letter: 'text-2xl', icon: 'text-sm',  spinner: 'w-4 h-4' },
  lg: { box: 'w-20 h-20', border: 'border-portal-gold/50', letter: 'text-3xl', icon: 'text-base', spinner: 'w-5 h-5' },
};

/**
 * The signed-in member's avatar; click it to upload a new profile photo.
 * size: 'md' (Dashboard) | 'lg' (Profile)
 */
function ProfilePhotoPicker({ size = 'md', className = '' }) {
  const { memberData } = useAuth();
  const { uploading, inputRef, handleChange, openPicker } = useProfilePhoto();
  const s = SIZES[size] ?? SIZES.md;

  return (
    <>
      <div
        className={`relative ${s.box} rounded-full bg-portal-red/20 border-2 ${s.border}
                    flex items-center justify-center flex-shrink-0 overflow-hidden ${className}
                    cursor-pointer group`}
        onClick={openPicker}
        title="Change profile photo"
      >
        {memberData?.profilePhoto
          ? <img src={memberData.profilePhoto} alt="" className="w-full h-full object-cover" />
          : <span className={`${s.letter} font-bold text-portal-gold`}>
              {memberData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
        }
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center
                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {uploading
            ? <InlineSpinner size={s.spinner} />
            : <>
                <i className={`fa-solid fa-camera text-white ${s.icon}`} />
                <span className="text-white text-[9px] mt-0.5 font-medium">Change</span>
              </>
          }
        </div>
      </div>
      {/* Hidden file input */}
      <input ref={inputRef} type="file" accept={PHOTO_ACCEPT} className="hidden" onChange={handleChange} />
    </>
  );
}

export default ProfilePhotoPicker;
