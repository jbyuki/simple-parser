class UnexpectedRuleEnd extends Error {
	constructor(ruleNumber : number, rule : string) {
		super(`Unexpected end in rule #${ruleNumber} '${rule}'`);
		this.name = "UnexpectedRuleEnd";
	}
}

class UnexpectedRuleChar extends Error {
	constructor(ruleNumber: number, rule: string, char: string) {
		super(`Unexpected char '${char}' in rule #${ruleNumber} '${rule}'`);
		this.name = "UnexpectedRuleChar";
	}
}

const enum RuleTokenOperator {
	None,
	OneOrMore,
	ZeroOrMore,
	ZeroOrOne,

};

abstract class RuleToken {
	op: RuleTokenOperator = RuleTokenOperator.None;
	capture: boolean;

}

class RuleCharToken extends RuleToken {
	c: string;
	constructor(c : string) { super(); this.c = c; }
}

class RuleNonTerminalToken extends RuleToken {
	name: string;
	constructor(name : string) { super(); this.name = name; }
}

class RuleCharsetToken extends RuleToken {
	charset: Set<string>;
	negative: boolean;
	constructor(charset : Set<string>, negative: boolean) { 
		super(); 
		this.charset = charset; 
		this.negative = negative; 
	}
}

class Rule {
	lhs: string;
	rhs: RuleToken[];
	action: (...args: any[]) => any;

	constructor(lhs: string, rhs: RuleToken[], action: (...args: any[]) => any) {
		this.lhs = lhs;
		this.rhs = rhs;
		this.action = action;
	}
};

class Grammar {
	startRule : string;

	rules : Rule[] = [];

	ruleCounter : number = 1;


	constructor(start : string) {
		this.startRule = start;

		return new Proxy(this, {
			set(source, key: string, rhs: [string, (...args: any[]) => any]) {
				const value = rhs[0];
				let i = 0;
				const ruleTokens : Array<RuleToken> = [];

				const skipws = () => {
					while(i < value.length && /\s/.test(value[i])) {
						++i;
					}
				};

				const check = (c: string | RegExp) => {
					if(typeof c == "string") {
						if(i < value.length && value[i] == c) {
							return true;
						}
						return false;
					} else {
						if(i < value.length && c.test(value[i])) {
							return true;
						}
						return false;
					}
				};

				const unexpectedChar = () : never => {
					if(i >= value.length) {
						throw new UnexpectedRuleEnd(source.ruleCounter, value);
					} else {
						throw new UnexpectedRuleChar(source.ruleCounter, value, value[i]);
					}
				};

				const expect = (c : string) => {
					if(i < value.length && value[i] == c) {
						++i;
					} else if(i < value.length) {
						throw new UnexpectedRuleChar(source.ruleCounter, value, value[i]);
					} else {
						throw new UnexpectedRuleEnd(source.ruleCounter, value);
					}
				};

				const checkNot = (c: string) => {
					if(i < value.length && value[i] != c) {
						return true;
					}
					return false;
				};

				const terminal = () => {
					if(check('[')) {
						expect('[');
						if(check('^')) {
							next();
							const negative = true;
							const charset  = new Set<string>();
							while(checkNot(']')) {
								const c = nextChar();
								if(check('-')) {
									next();
									let startRange = c.codePointAt(0) as number;
									let stopRange = nextChar().codePointAt(0) as number;

									if(startRange > stopRange) {
										[stopRange, startRange] = [startRange, stopRange]
									}

									for(let j=startRange; j<=stopRange; ++j) {
										charset.add(String.fromCodePoint(j));
									}

								} else {
									charset.add(c);
								}
							}
							token(RuleCharsetToken, charset, negative);


						} else {
							const negative = false;
							const charset  = new Set<string>();
							while(checkNot(']')) {
								const c = nextChar();
								if(check('-')) {
									next();
									let startRange = c.codePointAt(0) as number;
									let stopRange = nextChar().codePointAt(0) as number;

									if(startRange > stopRange) {
										[stopRange, startRange] = [startRange, stopRange]
									}

									for(let j=startRange; j<=stopRange; ++j) {
										charset.add(String.fromCodePoint(j));
									}

								} else {
									charset.add(c);
								}
							}
							token(RuleCharsetToken, charset, negative);


						}

						expect(']');
					} else if(checkNot('\'')) {
						token(RuleCharToken, nextChar());

					} else {
						unexpectedChar();

					}
				};

				const token = <T extends RuleToken>(type: { new(...args: any[]): T; }, ...args : any[]) => {
					ruleTokens.push(new type(...args));
				};

				const next = (n : number = 1) => {
					i += n;
				};

				const done = () => {
					return i >= value.length;
				};

				const magicChar = () : string | never => {
					if(!done()) {
						return value[i];
					} else {
						return unexpectedChar();
					}
				};

				const nextChar = () : string => {
					let c = "";
					if(check('%')) {
						next();
						c = magicChar();
						next();

					} else {
						c = value[i];
						next();
					}
					return c;
				};

				const nonTerminal = () => {
					let name = "";
					while(check(/[0-9a-zA-Z]/)) {
						name += value[i];
						next();
					}
					token(RuleNonTerminalToken, name);

				};

				const setOp = (op : RuleTokenOperator) => {
					ruleTokens[ruleTokens.length-1].op = op;
				};

				const setCapture = (capture: boolean) => {
					ruleTokens[ruleTokens.length-1].capture = capture;
				};


				skipws();

				while(i < value.length) {
					if(check('(')) {
						next();
						skipws();
						if(check('\'')) {
							expect('\'');
							terminal();
							expect('\'');

						} else if(check(/[a-zA-Z]/)) {
							nonTerminal();

						} else {
							unexpectedChar();

						}
						if(check('+')) { 
							setOp(RuleTokenOperator.OneOrMore); 
							next();
						}
						else if(check('*')) { 
							setOp(RuleTokenOperator.ZeroOrMore); 
							next();
						}
						else if(check('?')) { 
							setOp(RuleTokenOperator.ZeroOrOne); 
							next();
						}

						skipws();
						expect(')');
						setCapture(true);

					} else {
						if(check('\'')) {
							expect('\'');
							terminal();
							expect('\'');

						} else if(check(/[a-zA-Z]/)) {
							nonTerminal();

						} else {
							unexpectedChar();

						}
						if(check('+')) { 
							setOp(RuleTokenOperator.OneOrMore); 
							next();
						}
						else if(check('*')) { 
							setOp(RuleTokenOperator.ZeroOrMore); 
							next();
						}
						else if(check('?')) { 
							setOp(RuleTokenOperator.ZeroOrOne); 
							next();
						}

						setCapture(false);

					}

					skipws();

				}

				const rule = new Rule(key, ruleTokens, rhs[1]);
				source.rules.push(rule);

				source.ruleCounter++;

				return true;
			}
		});
	}

	isDefined(name: string) : boolean {
		for(const rule of this.rules) {
			if(rule.lhs == name) {
				return true;
			}
		}
		return false;
	}

}

class Parser {
	grammar: Grammar;


	constructor(grammar : Grammar) {
		if(!grammar.isDefined(grammar.startRule)) {
			throw new Error(`Start rule '${grammar.startRule}' is not defined.`);
		}

		const usedNonTerminal = new Set<string>();

		for(const rule of grammar.rules) {
			for(const ruleToken of rule.rhs) {
				if(ruleToken instanceof RuleNonTerminalToken) {
					if(!grammar.isDefined(ruleToken.name)) {
						throw new Error(`Non-terminal '${ruleToken.name}' is not defined.`);
					}
					usedNonTerminal.add(ruleToken.name);

				}
			}

		}
		for(const rule of grammar.rules) {
			if(!usedNonTerminal.has(rule.lhs)) {
				throw new Error(`Non-terminal '${rule.lhs}' defined but not used.`);
			}
		}

		this.grammar = grammar;


	}

	parse(str: string) : any {
		const buffer : Array<string | [string, any]>= str.split(''); 

		while(true) {
			let matched = false;
			for(const rule of this.grammar.rules.reverse())
			{
				let i = 0;
				while(i < buffer.length) {
					const captures : any[] = []; 

					let all_match = true;
					let j = i;
					for(const ruleToken of rule.rhs) {
						let matched : Array<string | [string, any]> = [];
						while(j < buffer.length) {
							const elem = buffer[j];
							if(ruleToken instanceof RuleNonTerminalToken) {
								if(typeof elem == "string" || elem[0] != ruleToken.name) {
									break;
								}
								matched.push(elem[1]);
								++j;

							} else if(ruleToken instanceof RuleCharToken) {
								if(typeof elem != "string" ||  elem != ruleToken.c) {
									break;
								}
								matched.push(elem);
								++j;

							} else if(ruleToken instanceof RuleCharsetToken) {
								if(typeof elem != "string") {
									break;
								}
								if(!ruleToken.negative) {
									if(!ruleToken.charset.has(elem)) {
										break;
									}
								} else {
									if(ruleToken.charset.has(elem)) {
										break;
									}
								}

								matched.push(elem);
								++j;

							}
							if(ruleToken.op == RuleTokenOperator.None || ruleToken.op == RuleTokenOperator.ZeroOrOne) {
								break;
							}

						}
						switch(ruleToken.op) {
						case RuleTokenOperator.None:
							all_match = matched.length == 1;
							break;
						case RuleTokenOperator.OneOrMore:
							all_match = matched.length >= 1;
							break;
						case RuleTokenOperator.ZeroOrMore:
							all_match = matched.length >= 0;
							break;
						case RuleTokenOperator.ZeroOrOne:
							all_match = matched.length <= 1;
							break;
						}

						if(!all_match) {
							break;
						}

						if(ruleToken.capture) {
							if(ruleToken instanceof RuleCharToken || ruleToken instanceof RuleCharsetToken) {
								captures.push(matched.join(""));
							}

							else if(ruleToken instanceof RuleNonTerminalToken && matched.length == 1) {
								captures.push(matched[0]);
							}

							else {
								captures.push(...matched);
							}

						}

					}

					if(all_match) {
						const resultAction = rule.action(captures);

						buffer.splice(i,j-i,[rule.lhs, resultAction]);

						matched = true;
					} 
					++i;

				}


				if(matched) {
					break;
				}
			}

			if(!matched) {
				break;
			}
		}
		console.log(buffer);

	}
}

const g = new Grammar("Expr");
g["Expr"] = ["(Expr) '+' (Expr)", (cap : any[]) => { return cap[0] + cap[1]; }];
g["Expr"] = ["(Expr) '*' (Expr)", (cap : any[]) => { return cap[0] * cap[1]; }];
g["Expr"] = ["'(' (Expr) ')'", (cap : any[]) => { return cap[0]; }];
g["Expr"] = ["(Num)", (cap : any[]) => { return cap[0]; }];
g["Num"] = ["('[0-9]'+)", (cap: any[]) => { return parseInt(cap[0]); }];

const parser = new Parser(g);

const result = parser.parse("2*5+2*6");

