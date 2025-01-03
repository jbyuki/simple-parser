Simple Parser
-------------

A simple parser generator

```typescript
const g = new Grammar("Exp"); // 'Exp' is the starting rule

// Defining the rules, order matters
g["Exp"] = ["(Exp) '+' (Exp)", (cap : any[]) => { return cap[0] + cap[1]; }];
g["Exp"] = ["(Exp) '*' (Exp)", (cap : any[]) => { return cap[0] * cap[1]; }];
g["Exp"] = ["'(' (Exp) ')'", (cap : any[]) => { return cap[0]; }];
g["Exp"] = ["(Num)", (cap : any[]) => { return cap[0]; }];
g["Num"] = ["('[0-9]'+)", (cap: any[]) => { return parseInt(cap[0]); }];

const parser = new Parser(g);
const result = parser.parse("2*5+2*6"); // => [["Exp", 22]]
```

Work in progress.

More complex calculator:

```typescript
const g = new Grammar("Exp");
g["Exp"] = ["(Exp) '+' (Exp)", (cap : any[]) => { return cap[0] + cap[1]; }];
g["Exp"] = ["(Exp) '-' (Exp)", (cap : any[]) => { return cap[0] - cap[1]; }];
g["Exp"] = ["(Exp) '*' (Exp)", (cap : any[]) => { return cap[0] * cap[1]; }];
g["Exp"] = ["(Exp) '/' (Exp)", (cap : any[]) => { return cap[0] / cap[1]; }];
g["Exp"] = ["'(' (Exp) ')'", (cap : any[]) => { return cap[0]; }];
g["Exp"] = ["s* (Exp) s*", (cap : any[]) => { return cap[0]; }];
g["Exp"] = ["(Num)", (cap : any[]) => { return cap[0]; }];
g["Exp"] = ["'(' s* '-' s* (Num) ')'", (cap : any[]) => { return -cap[0]; }];
g["Num"] = ["('[0-9]'+)", (cap: any[]) => { return parseInt(cap[0]); }];
g["s"]   = ["' '", (_: any[]) => { }];

const parser = new Parser(g);
const result = parser.parse("3 * 3 / (2 * (-2))"); // => [["Exp", -2.25]]
```

Todo
----

* [ ] Better error handler
* [ ] Optimized parser ( O(n) time complexity )
