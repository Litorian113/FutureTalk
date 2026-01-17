import * as React from "react";
import Svg, { Path, Rect, SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
    color?: string;
    size?: number;
}

export const TranslateIcon = ({ color = "#000", size = 24, ...props }: IconProps) => (
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
        <Path d="M12 19v3" />
        <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <Rect x="9" y="2" width="6" height="13" rx="3" />
    </Svg>
);
