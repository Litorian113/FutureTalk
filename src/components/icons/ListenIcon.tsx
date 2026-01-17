import * as React from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
    color?: string;
    size?: number;
}

export const ListenIcon = ({ color = "#000", size = 24, ...props }: IconProps) => (
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
        <Path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
        <Path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" />
    </Svg>
);
