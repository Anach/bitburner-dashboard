export const DASHBOARD_VIEW_METADATA = {
    "id": "mailbox",
    "renderer": "mailbox",
    "menuGroup": "software",
    "menuLabel": "Mailbox",
    "title": "Mailbox",
    "subtitle": "Messages, lore, and text files discovered across the network.",
    "widgets": [],
    "data": {
        "serviceId": "mail.mailbox",
        "messagesKey": "messages",
        "folderCountsKey": "folderCounts",
        "totalCountsKey": "totalCounts",
        "updatedKey": "generatedAt",
        "lastResultKey": "lastCommand"
    },
    "fields": {
        "id": "id",
        "source": "source",
        "subject": "subject",
        "content": "content",
        "read": "read",
        "folder": "folder",
        "firstSeenAt": "firstSeenAt",
        "type": "type"
    },
    "folders": [
        { "id": "Inbox", "label": "Inbox" },
        { "id": "Messages", "label": "Messages" },
        { "id": "Lore", "label": "Lore" },
        { "id": "Other", "label": "Other" }
    ],
    "commands": {
        "serviceId": "mail.mailbox",
        "markReadPrefix": "MarkRead:",
        "markUnreadPrefix": "MarkUnread:",
        "markAllReadPrefix": "MarkAllRead:",
        "deletePrefix": "Delete:"
    },
    "layout": {
        "folderPaneWidth": 200,
        "listPaneWidth": 340,
        "selectionDefaultVersion": 1
    }
};
