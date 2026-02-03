import * as React from "react";
import { Dimensions } from "react-native";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    const { width } = Dimensions.get("window");
    return width < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setIsMobile(window.width < MOBILE_BREAKPOINT);
    });

    return () => subscription?.remove();
  }, []);

  return isMobile;
}
