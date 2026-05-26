export const LOGO_ICON_SVG = `
${newLogoIconSvg.trim()}
`;

export const getFullLogoSVG = (width = "100%") => `
${newFullLogoSvg.trim().replace('style="width: 100%;', 'style="width: ${width};')}
`;
