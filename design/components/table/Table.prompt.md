Data table for admin CRUD lists. Right-aligned (RTL), uppercase tracked grey header, hairline dividers, soft hover. Wrap it in a `Card` for the standard list view. Scrolls horizontally on small screens.

```jsx
<Card style={{ padding: 0 }}>
  <Table>
    <THead>
      <TR><TH>שם החוג</TH><TH>מדריכה</TH><TH>יום ושעה</TH><TH>מחיר</TH><TH>סטטוס</TH></TR>
    </THead>
    <TBody>
      <TR>
        <TD>חוג שחייה לילדים</TD>
        <TD>דנה כהן</TD>
        <TD>יום שני · 16:30</TD>
        <TD>₪280</TD>
        <TD><Badge tone="success">פעיל</Badge></TD>
      </TR>
    </TBody>
  </Table>
</Card>
```

On mobile the source app collapses long tables into stacked cards — for narrow layouts prefer a card list over a cramped table.
