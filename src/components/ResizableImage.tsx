import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';

// ResizableImage component for Tiptap
export const ResizableImage = (props: NodeViewProps) => {
    const { node, updateAttributes, selected } = props;
    const [isResizing, setIsResizing] = useState(false);
    const [width, setWidth] = useState(node.attrs.width || '100%');
    const imageRef = useRef<HTMLImageElement>(null);
    const resizeStartRef = useRef<{ x: number, width: number } | null>(null);

    useEffect(() => {
        setWidth(node.attrs.width || '100%');
    }, [node.attrs.width]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!imageRef.current) return;

        const startX = e.clientX;
        const startWidth = imageRef.current.offsetWidth;
        const parentWidth = imageRef.current.parentElement?.offsetWidth || document.body.offsetWidth;

        setIsResizing(true);
        resizeStartRef.current = { x: startX, width: startWidth };

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeStartRef.current) return;

            const currentX = e.clientX;
            const diffX = currentX - resizeStartRef.current.x;
            const newWidth = Math.max(50, resizeStartRef.current.width + diffX); // Minimum 50px

            // Convert to percentage for responsiveness if preferred, or keep pixels
            // Let's use percentage for better adaptability
            const percentage = Math.min(100, Math.max(10, (newWidth / parentWidth) * 100));

            setWidth(`${percentage}%`);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            if (resizeStartRef.current && imageRef.current) {
                // Commit the final width to node attributes
                const parentWidth = imageRef.current.parentElement?.offsetWidth || document.body.offsetWidth;
                const finalWidthPx = imageRef.current.offsetWidth;
                const finalPercentage = Math.min(100, Math.max(10, (finalWidthPx / parentWidth) * 100));

                updateAttributes({
                    width: `${finalPercentage.toFixed(1)}%`,
                    style: `width: ${finalPercentage.toFixed(1)}%; height: auto;`
                });
            }
            resizeStartRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [updateAttributes]);

    return (
        <NodeViewWrapper className="resizable-image-wrapper inline-block relative leading-none">
            <div className={`relative inline-block ${selected ? 'ring-2 ring-indigo-500' : ''}`}>
                <img
                    ref={imageRef}
                    src={node.attrs.src}
                    alt={node.attrs.alt}
                    style={{
                        width: width,
                        height: 'auto',
                        maxWidth: '100%',
                        display: 'block'
                    }}
                    className={`block transition-none ${isResizing ? 'opacity-80' : ''}`}
                    draggable={false} // Disable native drag to prevent ghosts
                />

                {/* Resize Handles - Only visible when selected */}
                {selected && (
                    <>
                        {/* Bottom Right Handle (Main one usually) */}
                        <div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 border-2 border-white rounded-full cursor-nwse-resize z-10 -mb-2 -mr-2 shadow-sm"
                            onMouseDown={handleMouseDown}
                        />
                        {/* We can add more handles if needed, but bottom-right is standard for aspect ratio toggle usually */}
                    </>
                )}
            </div>
        </NodeViewWrapper>
    );
};
