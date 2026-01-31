import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
    color?: string;
    size?: number;
}

export const RealtimeIcon = ({ color = "#000", size = 24, ...props }: IconProps) => (
    <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
);
