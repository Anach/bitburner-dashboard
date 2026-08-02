export const DASHBOARD_PLUGIN_METADATA = {
    "adapter": "script",
    "serviceId": "automation.stockTrader",
    "menuGroup": "finances",
    "menuLabel": "Stock Trader",
    "description": "Trades stocks automatically using TIX and 4S market data while tracking activity and profit or loss.",
    "requirements": [
        { "type": "stock", "id": "tix" },
        { "type": "stock", "id": "4s-tix" }
    ],
    "daemon": true,
    "panels": [
        { "id": "status", "label": "Status", "title": "Stock Trader", "accent": "#6cb4ff", "subtitle": "Trading activity and current profit or loss" },
        { "id": "history", "label": "Graphs", "title": "Stock Trader Graphs", "accent": "#c084fc", "subtitle": "Recent profit, loss, and market position trends" }
    ],
    "telemetry": {
        "path": "data/stock_activity_stats.json",
        "fields": [
            { "key": "trades", "label": "Trades", "tone": "info", "panelId": "status" },
            { "key": "buys", "label": "Buys", "tone": "success", "panelId": "status" },
            { "key": "sells", "label": "Sells", "tone": "warn", "panelId": "status" },
            { "key": "positions.longShares", "label": "Long Shares", "tone": "neutral", "panelId": "status" },
            { "key": "positions.shortShares", "label": "Short Shares", "tone": "neutral", "panelId": "status" },
            { "key": "lastAction", "label": "Last Action", "tone": "info", "panelId": "status" },
            { "key": "lastActionTime", "label": "Last Action Time", "tone": "neutral", "format": "time", "panelId": "status" },
            { "key": "pnl.lastStatus", "label": "P/L Status", "tone": "signed", "toneKey": "pnl.total", "format": "uppercase", "panelId": "status" },
            { "key": "pnl.realized", "label": "Realized P/L", "tone": "signed", "format": "signedMoney", "panelId": "status" },
            { "key": "pnl.unrealized", "label": "Unrealized P/L", "tone": "signed", "format": "signedMoney", "panelId": "status" },
            { "key": "pnl.total", "label": "Total P/L", "tone": "signed", "format": "signedMoney", "panelId": "status" }
        ],
        "sections": [
            {
                "id": "stock-pnl",
                "type": "graph",
                "panelId": "history",
                "title": "Profit / Loss",
                "sourceKey": "history",
                "xKey": "timestamp",
                "xFormat": "time",
                "yFormat": "money",
                "height": 250,
                "maxPoints": 240,
                "includeZero": true,
                "emptyText": "Collecting stock profit and loss history...",
                "series": [
                    { "key": "pnl.total", "label": "Total", "color": "#c084fc", "strokeWidth": 2.5 },
                    { "key": "pnl.realized", "label": "Realized", "color": "#6ee7a8" },
                    { "key": "pnl.unrealized", "label": "Unrealized", "color": "#6cb4ff" }
                ]
            },
            {
                "id": "stock-positions",
                "type": "graph",
                "panelId": "history",
                "title": "Open Positions",
                "sourceKey": "history",
                "xKey": "timestamp",
                "xFormat": "time",
                "yFormat": "number",
                "height": 250,
                "maxPoints": 240,
                "includeZero": true,
                "emptyText": "Collecting stock position history...",
                "series": [
                    { "key": "positions.longShares", "label": "Long", "color": "#6ee7a8" },
                    { "key": "positions.shortShares", "label": "Short", "color": "#ff9696" }
                ]
            }
        ]
    },
    "alwaysVisible": true,
    "defaultPanelId": "status"
};
