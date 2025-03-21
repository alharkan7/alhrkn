import React from 'react';

interface InfoTipProps {
  content: string;
}

const InfoTip: React.FC<InfoTipProps> = ({ content }) => {
  return (
    <div className="bg-white border border-gray-200 p-3 rounded-md shadow-md mt-2 text-sm text-gray-700 max-w-xs">
      <p>{content}</p>
    </div>
  );
};

export default InfoTip; 