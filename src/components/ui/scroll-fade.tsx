"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ScrollFadeXProps = {
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    /** Width of the gradient overlays in pixels (default 48) */
    fadeWidthPx?: number;
};

/**
 * ScrollFadeX: wraps a horizontal scroller and shows subtle left/right gradient hints
 * when more content is available to scroll.
 */
export default function ScrollFadeX({
    children,
    className,
    contentClassName,
    fadeWidthPx = 48,
}: ScrollFadeXProps) {
    const ref = React.useRef<HTMLDivElement | null>(null);
    const [showLeft, setShowLeft] = React.useState(false);
    const [showRight, setShowRight] = React.useState(false);

    const update = React.useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const { scrollLeft, clientWidth, scrollWidth } = el;
        setShowLeft(scrollLeft > 0);
        setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
    }, []);

    React.useEffect(() => {
        update();
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [update]);

    return (
        <div className={cn("relative", className)}>
            <div
                ref={ref}
                onScroll={update}
                className={cn(
                    "overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                )}
            >
                <div className={cn("flex gap-4", contentClassName)}>{children}</div>
            </div>
            {showLeft && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-0 bottom-0 bg-gradient-to-r from-background/90 to-transparent"
                    style={{ width: fadeWidthPx }}
                />
            )}
            {showRight && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-0 bottom-0 bg-gradient-to-l from-background/90 to-transparent"
                    style={{ width: fadeWidthPx }}
                />
            )}
        </div>
    );
}
