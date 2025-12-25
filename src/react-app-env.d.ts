/// <reference types="react-scripts" />

declare namespace JSX {
    interface IntrinsicElements {
        webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
            src?: string;
            style?: React.CSSProperties;
            partition?: string;
            nodeintegration?: string;
            plugins?: string;
            preload?: string;
            httpreferrer?: string;
            useragent?: string;
            disablewebsecurity?: string;
            allowpopups?: string;
        };
    }
}
