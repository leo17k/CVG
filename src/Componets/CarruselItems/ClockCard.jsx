import React, { useState, useEffect } from 'react';

const ClockCard = ({ timezone = 'local' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (d) => {
    return d.toLocaleTimeString();
  };

  const formatDate = (d) => {
    return d.toLocaleDateString();
  };

  return (
      <div className="flex flex-col h-full items-center p-4 rounded-xl border border-gray-200 h-full bg-white shadow-sm max-w-sm">

      <div className="text-2xl font-bold mt-2">{formatTime(time)}</div>
      <div className="text-sm text-slate-600 mt-1">{formatDate(time)}</div>
    </div>
  );
};

export default ClockCard;
