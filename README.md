Simple Parser
-------------

A simple parser generator

```typescript
const g = new Grammar("Expr"); // 'Expr' is the starting rule

// Defining the rules, order matters
g["Expr"] = ["(Expr) '+' (Expr)", (cap : any[]) => { return cap[0] + cap[1]; }];
g["Expr"] = ["(Expr) '*' (Expr)", (cap : any[]) => { return cap[0] * cap[1]; }];
g["Expr"] = ["'(' (Expr) ')'", (cap : any[]) => { return cap[0]; }];
g["Expr"] = ["(Num)", (cap : any[]) => { return cap[0]; }];
g["Num"]  = ["('[0-9]'+)", (cap: any[]) => { return parseInt(cap[0]); }];

const parser = new Parser(g);
const result = parser.parse("2*5+2*6"); // => [["Expr", 22]]
```

Work in progress.

Todo
----

* [ ] Optimized parser ( O(n) time complexity )
