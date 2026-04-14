import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount } from "../Avatar";
import { Mensageria } from "../Mensajeria/Mensageria";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Constext/AuthToken";
import ChatPopup from "../Mensajeria/Chat";

const UserCarrucel = ({ users, loading = false, datauser }) => {

  const [selectedUser, setSelectedUser] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
    <div className="flex items-center space-x-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <AvatarGroup className="grayscale hover:grayscale-0 transition-all">
        {users?.slice(0, 3).map((user, index) => (
          <Avatar
            key={user.id || index}
            size="default"
            onClick={() => handleSelectUser(user)}
            className="cursor-pointer hover:-translate-y-1 transition-transform"
          >
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
        ))}

        {users?.length > 3 && (
          <AvatarGroupCount size="default">
            +{users.length - 3}
          </AvatarGroupCount>
        )}
      </AvatarGroup>

      {/* RENDERIZADO DEL CHAT O BURBUJA */}
      {selectedUser && (
        <>
          {chatOpen ? (
            <ChatPopup
              user={selectedUser}
              datauser={datauser}
              onClose={handleCloseChat}
              onMinimize={handleMinimize} // Debes agregar este prop a tu ChatPopup
            />
          ) : isMinimized ? (
            <ChatBubble
              user={selectedUser}

              onClick={() => { setChatOpen(true); setIsMinimized(false); }}
            />
          ) : null}
        </>
      )}
    </div>
  );
};


export default UserCarrucel;