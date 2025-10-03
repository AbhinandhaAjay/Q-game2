import React from 'react';

const TileComponent = ({ tile, selected = false, onClick = null, className = '' }) => {
  const getShapeElement = (shape, color) => {
    const shapeClass = `w-8 h-8 ${color}`;
    
    switch (shape) {
      case 'star':
        return (
          <div className={`${shapeClass} relative`}>
            <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        );
      case '8star':
        return (
          <div className={`${shapeClass} relative`}>
            <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
              <path d="M12 1l2.5 5h5.5l-4.5 3.5 1.5 5.5-4.5-3.5-4.5 3.5 1.5-5.5-4.5-3.5h5.5l2.5-5z" />
            </svg>
          </div>
        );
      case 'square':
        return <div className={`${shapeClass} rounded-sm`} />;
      case 'circle':
        return <div className={`${shapeClass} rounded-full`} />;
      case 'clover':
        return (
          <div className={`${shapeClass} relative`}>
            <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
              <path d="M12 2c-1.5 0-3 1-3 3s1.5 3 3 3 3-1 3-3-1.5-3-3-3zm-6 6c-1.5 0-3 1-3 3s1.5 3 3 3 3-1 3-3-1.5-3-3-3zm12 0c-1.5 0-3 1-3 3s1.5 3 3 3 3-1 3-3-1.5-3-3-3zm-6 6c-1.5 0-3 1-3 3s1.5 3 3 3 3-1 3-3-1.5-3-3-3z" />
            </svg>
          </div>
        );
      case 'diamond':
        return (
          <div className={`${shapeClass} transform rotate-45`} />
        );
      default:
        return <div className={`${shapeClass} rounded-sm`} />;
    }
  };

  const getColorClass = (color) => {
    switch (color) {
      case 'red': return 'text-red-600';
      case 'green': return 'text-green-600';
      case 'blue': return 'text-blue-600';
      case 'yellow': return 'text-yellow-500';
      case 'orange': return 'text-orange-600';
      case 'purple': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getBgColorClass = (color) => {
    switch (color) {
      case 'red': return 'bg-red-600';
      case 'green': return 'bg-green-600';
      case 'blue': return 'bg-blue-600';
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-600';
      case 'purple': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div 
      className={`
        w-14 h-14 bg-white border-2 rounded-lg shadow-md
        flex items-center justify-center cursor-pointer
        transition-all duration-200 hover:shadow-lg
        ${selected ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' : 'border-gray-300'}
        ${className}
      `}
      onClick={onClick}
      data-testid={`tile-${tile.shape}-${tile.color}`}
    >
      {tile.shape === 'square' || tile.shape === 'circle' || tile.shape === 'diamond' ? (
        getShapeElement(tile.shape, getBgColorClass(tile.color))
      ) : (
        getShapeElement(tile.shape, getColorClass(tile.color))
      )}
    </div>
  );
};

export default TileComponent;