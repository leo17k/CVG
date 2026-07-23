import React, { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroupCount } from "../Avatar";
import ChatPopup from "../Mensajeria/Chat";

const UserCarrucel = ({ users = [], loading = false, datauser, interactive = true }) => {

  const [selectedUser, setSelectedUser] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const visibleUsers = users.slice(0, 3);
  const extraCount = Math.max(0, users.length - 3);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setChatOpen(true);
    setIsMinimized(false);
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setSelectedUser(null);
  };

  const handleMinimize = () => {
    setChatOpen(false);
    setIsMinimized(true);
  };

  if (loading) return (
    <div className="inline-flex items-center gap-3 max-w-full ">
      <div className="relative flex items-center min-w-0">
        {[1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-10 w-10 rounded-full bg-slate-200 animate-pulse border border-white ${index > 0 ? '-ml-3' : ''}`}
          />
        ))}
      </div>
      <div className="h-10 min-w-10 rounded-full bg-slate-200 animate-pulse" />
    </div>
  );

  return (
    <div className="inline-flex items-center gap-3 max-w-full ">
      <div className="relative flex items-center min-w-0">
        {visibleUsers.map((user, index) => (
          <Avatar
            key={user?.id || `user-${index}`}
            size="default"
            onClick={() => interactive && handleSelectUser(user)}
            className={`cursor-pointer border-2 border-white ${index > 0 ? '-ml-3' : ''} ${interactive ? 'hover:-translate-y-1 transition-transform' : ''}`}
          >
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.initials}</AvatarFallback>
          </Avatar>
        ))}
      </div>

      {extraCount > 0 && (
        <AvatarGroupCount
          size="default"
          className="text-sm bg-slate-100/90 border border-slate-200 text-slate-800"
        >
          +{extraCount}
        </AvatarGroupCount>
      )}

      {selectedUser && (
        <div className="ml-3">
          {chatOpen ? (
            <ChatPopup
              user={selectedUser}
              datauser={datauser}
              onClose={handleCloseChat}
              onMinimize={handleMinimize}
            />
          ) : isMinimized ? (
            <button
              type="button"
              className="rounded-full bg-white border border-slate-200 px-3 py-2 shadow-sm text-sm font-semibold text-slate-700"
              onClick={() => { setChatOpen(true); setIsMinimized(false); }}
            >
              {selectedUser.name || 'Chat'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};


export default UserCarrucel;