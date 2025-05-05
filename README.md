## Sync Engine

This is my attempt on writing a sync engine in go. This project is heavily inspired by the work of Figma and Linear

### Issues on my mind to solve

1. Race Conditions in WebSocket Transactions

Problem: Multiple clients hitting the same task at once creates race conditions. Last write wins, potentially trashing earlier changes.

2. Optimistic Updates Without Proper Conflict Resolution
Frontend does optimistic updates:

Problem: Server rejects a transaction but client UI doesn't roll back properly. Now the client's state is screwed up.

3. Transaction Ordering Guarantees
Backend fetches transactions by ID:

Problem: Network delays mess up transaction arrival order. Processing strictly by ID might execute operations in the wrong sequence.

4. No offline support
I don't think there is any support for offline mode in this project. Would be sweet to implement that as well.


### References
- [Building an offline realtime sync engine](https://gist.github.com/pesterhazy/3e039677f2e314cb77ffe3497ebca07b)
- [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Linear's realtime sync system](https://www.youtube.com/watch?v=WxK11RsLqp4&t=2169s&ab_channel=Fraktio)
- [Scaling the Linear Sync Engine](https://linear.app/blog/scaling-the-linear-sync-engine))](https://linear.app/blog/scaling-the-linear-sync-engine)
`