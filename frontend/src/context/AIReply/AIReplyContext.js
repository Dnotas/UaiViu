import React, { useState, createContext } from "react";

const AIReplyContext = createContext();

const AIReplyProvider = ({ children }) => {
  const [aiGeneratedReply, setAIGeneratedReply] = useState(null);

  return (
    <AIReplyContext.Provider
      value={{ aiGeneratedReply, setAIGeneratedReply }}
    >
      {children}
    </AIReplyContext.Provider>
  );
};

export { AIReplyContext, AIReplyProvider };
