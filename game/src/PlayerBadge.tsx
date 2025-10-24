import * as React from "react";

//temporario para teste do frontend, integrar com o back e remover
type PlayerBadgeProps = {
    playerNumber: number | string;
    color: string;
    territories: string[];
    position?: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
    active?: boolean;
    onSelect?: () => void;
};

const containerBase: React.CSSProperties = {
    position: "fixed",
    zIndex: 20,
    userSelect: "none",
};

const badgeStyleBase: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    cursor: "pointer",
};

const tooltipStyleBase: React.CSSProperties = {
    position: "absolute",
    bottom: 60,
    left: 0,
    padding: "10px 12px",
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    minWidth: 220,
    maxWidth: 280,
    maxHeight: 240,
    overflowY: "auto",
    color: "#222",
    fontSize: 14,
    lineHeight: 1.35,
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
    color: "#444",
};

const listStyle: React.CSSProperties = {
    margin: 0,
    paddingLeft: 18,
};

const PlayerBadge: React.FC<PlayerBadgeProps> = ({
    playerNumber,
    color,
    territories,
    position,
    active,
    onSelect,
}) => {
    const [open, setOpen] = React.useState(false);

    const containerStyle: React.CSSProperties = {
        ...containerBase,
        // preferir 'top' quando fornecido; caso contrário usar 'bottom'
        ...(position?.top !== undefined
            ? { top: position.top }
            : { bottom: position?.bottom ?? 18 }),
        left: position?.left,
        right: position?.right ?? 18,
    };

    const getOutlineColor = (playerColor: string) => {
        // Para cores claras (como branco), usa cinza escuro no outline
        if (playerColor === "#d2d9e3ff" || playerColor.toLowerCase().includes("fff") || playerColor.toLowerCase().includes("white")) {
            return "#b1b1b1a1";
        }
        return `${playerColor}66`;
    };

    const badgeStyle: React.CSSProperties = {
        ...badgeStyleBase,
        background: color,
        outline: active ? `3px solid ${getOutlineColor(color)}` : undefined,
        transform: active ? "scale(1.04)" : undefined,
        transition: "transform 120ms ease, outline-color 120ms ease",
    };

    return (
        <div
            style={containerStyle}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onClick={onSelect}
        >
            <div style={badgeStyle} title={`Jogador ${playerNumber}`}>
                {playerNumber}
            </div>
            {open && (
                <div style={tooltipStyleBase}>
                    <p style={titleStyle}>
                        Territórios do Jogador {playerNumber}
                    </p>
                    {territories.length === 0 ? (
                        <div style={{ color: "#777" }}>Nenhum território</div>
                    ) : (
                        <ul style={listStyle}>
                            {territories.map((id) => (
                                <li key={id}>{id}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlayerBadge;

