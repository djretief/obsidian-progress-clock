export interface ProgressClockSettings {
    colors: string[];
    contextMenu: boolean;
    imageSettings: ImageOptions;
    themeable: boolean;
}

export const DEFAULT_SETTINGS: ProgressClockSettings = {
    colors: [
        'rgba(0, 255, 0, 1)',
        'rgba(127, 127, 127, 1)',
    ],
    contextMenu: true,
    imageSettings: {
        format: 'image/png',
        quality: 0.92
    },
    themeable: false
}

export interface ImageOptions {
    format: 'image/jpeg' | 'image/png' | 'image/webp';
    quality: number;
}

export interface DataField {
    dataTitle: string;
    data: string | string[];
    ticked: string | string[];
    tickColor: string | string[];
    tockColor: string | string[];
}
