/**
 * Small round avatar for member lists: the profile photo, or the first
 * letter of the name.
 */
function MemberAvatar({ member }) {
  return (
    <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/30
                    flex items-center justify-center flex-shrink-0 overflow-hidden">
      {member.profilePhoto
        ? <img src={member.profilePhoto} alt="" className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-portal-gold">
            {member.fullName?.charAt(0)?.toUpperCase()}
          </span>
      }
    </div>
  );
}

export default MemberAvatar;
