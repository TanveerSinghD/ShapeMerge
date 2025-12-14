# Virtual Café (CE303)

Virtual Café is a socket-based client/server app with a multithreaded Barista that manages tea/coffee orders and per-drink brew queues, and a Customer client that sends text commands. Orders move from waiting → brewing → tray with capacity limits and async notifications back to the right customer.

## How to compile and run
From macOS Terminal, in the project root:
```bash
cd /Users/tanveersd/Desktop/VirtualCafe/Code
javac Barista.java Customer.java
```
Start the barista server (default port 5000, change if needed):
```bash
java Barista [port]
```
Start each customer in its own terminal tab/window, pointing to the barista host/port (use `localhost` if on the same machine):
```bash
java Customer [host] [port]   # e.g. java Customer localhost 5000
```
If port 5000 is in use, pick another (e.g. 5001) for both server and clients.

## How to use (commands)
- `order <items>` e.g. `order 1 tea` or `order 1 tea and 2 coffees`
- `order status`
- `collect`
- `exit` (Ctrl+C also triggers exit)

## Notable features
- Multithreaded server: thread-per-client plus fixed tea/coffee brew pools enforcing per-drink capacity.
- Order lifecycle: items queue, move waiting → brewing → tray with async completion notifications to the correct customer.
- Parsing: accepts `order X tea(s) [and Y coffee(s)]` with flexible spacing/plurals via regex.
- Resilience: client exits remove queued drinks; brewing drinks finish but are discarded; names free after brewing.

## Known issues / limitations
- No JSON log file or persistence.
- Abandoned drinks are not reassigned to other customers.
- Name reuse is blocked while any brewing items remain to avoid stray notifications.

## Reflection
- Trade-off: fixed brew capacities and a simple line protocol kept concurrency manageable.
- Went well: using per-drink queues + thread pools simplified enforcing capacity.
- To improve: add logging/persistence or reclaim abandoned drinks.
- Lesson: keep protocols simple and guard shared state with clear ownership (`Cafe` lock).

# Presentation flow with code pointers (for the video)
Legend: `[Terminal]` = commands to run, `[Code]` = source file to show.
- **00:00–00:40 — Introduction.** Virtual Café overview; capacities 2 teas/2 coffees; brew times 30s/45s; flow waiting → brewing → tray.
- **00:40–01:20 — Show setup.** **[Terminal]** Two terminals (server + clients). Nothing else open.
- **01:20–02:00 — Compile/start server.** **[Terminal]** `javac ...`, then `java Barista`. Point to “listening” log.
- **02:00–02:30 — Server entrypoint.** **[Code]** `Code/Barista.java:21` constants, `:28–32` thread pools, `:47–62` accept loop to `ClientHandler`.
- **02:30–03:00 — Start customers.** **[Terminal]** `java Customer localhost 5000` twice; two unique names.
- **03:00–03:30 — Place orders.** **[Terminal]** A: `order 1 tea and 1 coffee`; B: `order 2 coffees`. Orders accumulate.
- **03:30–04:00 — Server structure.** **[Code]** `Code/Barista.java:323` (`Cafe` lock + maps + brew lines with queues/pools).
- **04:00–04:25 — Order flow.** **[Code]** `Code/Barista.java:431` (`queueDrinks`, `processLine`, `finishBrew`) for waiting → brewing → tray + notifications.
- **04:25–04:40 — Commands/handshake.** **[Code]** `Code/Barista.java:95–156` (`handleHandshake`, `listenForCommands`, `handleCommand`).
- **04:40–04:55 — Parsing.** **[Code]** `Code/Barista.java:569` (`OrderRequest.parse` regex).
- **04:55–05:15 — Client code.** **[Code]** `Code/Customer.java:29` start logic: background reader thread, foreground user input, shutdown hook sends `exit`.
- **05:15–06:00 — Check status.** **[Terminal]** `order status`; read waiting/brewing/tray; show server summary.
- **06:00–08:00 — Collect flow.** **[Terminal]** Wait for “Please collect!”, then `collect`; show early “pending” message if applicable.
- **08:00–09:00 — Exit/cleanup.** **[Terminal]** `exit`; queued removed, brewing discarded, name freed.
- **09:00–10:00 — Wrap up.** Summarize capacities, notifications, parsing, and the above code sections; brief reflection.
