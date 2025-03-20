import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

interface InfoBoxProps {
  title: string;
  content: string | string[];
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left' | 'right' | 'top' | 'bottom';
  type?: 'text' | 'list' | 'typing';
  delay?: number;
  onClick?: () => void;
  isActive?: boolean;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const blink = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(68, 136, 255, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(68, 136, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(68, 136, 255, 0); }
`;

const glowEffect = keyframes`
  0% { box-shadow: 0 0 5px 2px rgba(68, 136, 255, 0.5); }
  50% { box-shadow: 0 0 15px 5px rgba(68, 136, 255, 0.7); }
  100% { box-shadow: 0 0 5px 2px rgba(68, 136, 255, 0.5); }
`;

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const Container = styled.div<{ position: string; isActive?: boolean }>`
  position: absolute;
  background-color: rgba(0, 10, 30, 0.75);
  border: 1px solid rgba(68, 136, 255, 0.8);
  border-radius: 4px;
  color: #ffffff;
  padding: 10px 15px;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  width: ${props => props.isActive ? '280px' : '220px'};
  max-height: ${props => props.isActive ? '220px' : '150px'};
  overflow: auto;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 18px rgba(68, 136, 255, 0.35);
  animation: ${fadeIn} 0.3s ease-out;
  z-index: 10;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  
  &:hover {
    background-color: rgba(0, 20, 50, 0.85);
    box-shadow: 0 0 25px rgba(68, 136, 255, 0.6);
    transform: scale(1.04);
  }
  
  ${props => props.isActive && css`
    background-color: rgba(0, 30, 70, 0.9);
    animation: ${glowEffect} 1.8s infinite;
    transform: scale(1.06);
    z-index: 20;
    
    &:before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border: 2px solid rgba(68, 136, 255, 0.9);
      border-radius: 6px;
      pointer-events: none;
    }
  `}

  /* Position styles */
  ${({ position }) => {
    switch (position) {
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-right':
        return 'bottom: 20px; right: 20px;';
      case 'left':
        return 'top: 50%; left: 20px; transform: translateY(-50%);';
      case 'right':
        return 'top: 50%; right: 20px; transform: translateY(-50%);';
      case 'top':
        return 'top: 20px; left: 50%; transform: translateX(-50%);';
      case 'bottom':
        return 'bottom: 20px; left: 50%; transform: translateX(-50%);';
      default:
        return 'top: 20px; left: 20px;';
    }
  }}
  
  &:after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(68, 136, 255, 0.7), transparent);
  }
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #4488ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-shadow: 0 0 5px rgba(68, 136, 255, 0.5);
  letter-spacing: 0.5px;
  position: relative;
  padding-bottom: 4px;
  
  &:after {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: #4488ff;
    border-radius: 50%;
    margin-left: 5px;
    box-shadow: 0 0 8px 2px rgba(68, 136, 255, 0.6);
    animation: ${pulse} 2s infinite;
  }
  
  &:before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent, #4488ff, transparent);
  }
`;

const Content = styled.div<{ isActive?: boolean }>`
  line-height: 1.4;
  opacity: 0.9;
  transition: all 0.3s ease;
  animation: ${props => props.isActive ? css`${slideIn} 0.3s ease-out` : 'none'};
  
  &:hover {
    opacity: 1;
  }
`;

const List = styled.ul`
  margin: 0;
  padding-left: 15px;
  
  li {
    margin-bottom: 6px;
    position: relative;
    
    &:before {
      content: '';
      position: absolute;
      left: -15px;
      top: 8px;
      width: 6px;
      height: 2px;
      background-color: rgba(68, 136, 255, 0.8);
      border-radius: 1px;
    }
    
    &:hover {
      color: #a0c8ff;
      text-shadow: 0 0 3px rgba(68, 136, 255, 0.5);
    }
  }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 6px;
  height: 14px;
  background-color: #4488ff;
  margin-left: 2px;
  animation: ${blink} 0.7s infinite;
  vertical-align: middle;
  box-shadow: 0 0 5px rgba(68, 136, 255, 0.8);
  border-radius: 1px;
`;

export const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  content,
  position,
  type = 'text',
  delay = 0,
  onClick,
  isActive
}) => {
  const [visible, setVisible] = useState(false);
  const [typedContent, setTypedContent] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const contentRef = useRef<string>('');
  
  // Handle delay for appearance
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  // Handle typing animation
  useEffect(() => {
    if (type === 'typing' && visible) {
      if (typeof content === 'string') {
        contentRef.current = content;
      } else if (Array.isArray(content) && content.length > 0) {
        contentRef.current = content.join(' • ');
      }
      
      if (typingIndex < contentRef.current.length) {
        const typingTimer = setTimeout(() => {
          setTypedContent(prev => prev + contentRef.current.charAt(typingIndex));
          setTypingIndex(prev => prev + 1);
        }, 30 + Math.random() * 50); // Random typing speed for more realistic effect
        
        return () => clearTimeout(typingTimer);
      }
    }
  }, [content, type, visible, typingIndex]);
  
  if (!visible) return null;
  
  return (
    <Container 
      position={position} 
      onClick={onClick}
      isActive={isActive}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Title>{title}</Title>
      <Content isActive={isActive}>
        {type === 'text' && typeof content === 'string' && content}
        {type === 'list' && Array.isArray(content) && (
          <List>
            {content.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </List>
        )}
        {type === 'typing' && (
          <>
            {typedContent}
            {typingIndex < contentRef.current.length && <Cursor />}
          </>
        )}
      </Content>
      {isHovered && (
        <div style={{ 
          position: 'absolute', 
          bottom: '5px', 
          right: '5px', 
          fontSize: '10px', 
          color: 'rgba(68, 136, 255, 0.8)',
          textShadow: '0 0 3px rgba(0, 0, 0, 0.5)'
        }}>
          {isActive ? 'Click to minimize' : 'Click to expand'}
        </div>
      )}
    </Container>
  );
};