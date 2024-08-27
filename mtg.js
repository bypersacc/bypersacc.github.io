/* This file uses functions from the util.js file */

function chunkArray(arr, size)
{
	return arr.length > size && arr.length > 0
			? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
			: [arr];
}
  
function windowArray(inputArray, size)
{ 
  return inputArray
    .reduce((acc, _, index, arr) => {
      if (index+size > arr.length) {
        //we've reached the maximum number of windows, so don't add any more
        return acc;
      }
      
      //add a new window of [currentItem, maxWindowSizeItem)
      return acc.concat(
        //wrap in extra array, otherwise .concat flattens it
        [arr.slice(index, index+size)]
      );
      
    }, []);
}

function compose(...functions)
{
	return (input) =>
	{
		return functions.reduceRight((acc, fn) => { return fn(acc); }, input);
	};
};

function getUnicodeWithOffset(startUnicodeCharacter, offset)
{
    const parse = startUnicodeCharacter.charCodeAt(0);
    const add = parse + parseInt(offset);
    const reParse = String.fromCharCode(add);
    return reParse;
}

function getCryptoStrongRandomInt(max) {
    const randomBuffer = new Uint32Array(1);

    window.crypto.getRandomValues(randomBuffer);

    const randomNumber = randomBuffer[0] / (0xffffffff + 1);
    const result = Math.floor(randomNumber * max) + 1;
	
	return result;
}

//this generates div-mod decompositions of an "exponent complete" number (2^2, 3^3, 4^4, etc...)
//decomposition algorithm example (for 4^4)
//mod 4^4, then div 4^3 = size (NOTE: this has the effect of just doing the division)
//mod 4^3, then div 4^2 = color
//mod 4^2, then div 4^1 = alphabet system
//mod 4^1, then div 4^0 = symbols (mod) (NOTE: this has the effect of just doing the mod)
//TODO: this implies all decomposed numbers are uniform! Simulate this to test it out (compared to fully composed nubmers)
function decompose(rng, n)
{
	return [...Array(n)].map((x, i) => integerDivide((rng % (n ** (i + 1))), n**i));
}

// executeShuffle -- function that composes domain logic into a workflow that produces html content.
//shuffler: l => [n], where [n] is of length, "l", and n is a number in algorithm range
//transformer: n => str, where n is a randomly generated number in range, and str contains pre-printed string values (for example, if algorithm uses numbers and colors, str may be '1r', etc 
//htmlElementFactory: str => divContent, takes the pre-print string and creates html that will be put inside the shuffle div
function createShuffle(shuffler, transformer, htmlElementFactory) 
{
	const randomRaws = shuffler(10);
	
	const transformed = randomRaws.map(transformer).reduce((f, s) => `${f}${s}`);
	
	const shuffleContent = htmlElementFactory(transformed)
	
	return shuffleContent;
}

//event handler
//algorithmName = name of shuffle algorithm to use... low budget strategy pattern...
function onShuffleClick(algorithmName)
{
	document.getElementById("algorithm").innerHTML = algorithmName;

	let shuffleContent = '###-###-####';
	let shuffleDocs = '';
	
	//criteria:
	//	4 sizes
	//	4 symbols (assuming alphanumeric order -- abcde, 12345, etc)
	//	4 colors (#ff0000, #00ff00, #0000ff, #87cefa)
	//	4 alphabet systems (numbers, lowercase, uppercase, greek (lower))
	if (algorithmName == '2dQuartic')
	{
		shuffleDocs = 'greek alphabet: alpha, beta, gamma, delta, epsilon\n'
					  + 'display set order: numbers, lowercase, uppercase, greek\n'
					  + '  POSTSHUFFLE: roll 4 piles * 3 choices = 4! = d24 (or some combination), then decompose result: mod 4, mod 3, then mod 2';
					  
		function stringify(decomposition)
		{
			return decomposition.reduce((f, s) => f + `${s}`, '');
		}
		
		function decoratePrePrint(prePrint)
		{
			//size function
			function toSize(n)
			{
				//we know that, for sizes of 3, we want 500% size
				const baseValue = 2;
				const baseSize = 500;
				const sizeValueRatio = baseSize / 2;
				
				//thus, can extrapolate to other sizes
				const nSize = (parseInt(n) + 1) * sizeValueRatio;
				
				return nSize;
			}
			
			//color function -- this happens in span styling, so outputs something readable as a style
			//fourth color: '#87cefa' creates the most distinct set, but #000000 may be more intuitive to sort by
			function toColor(n)
			{
				const colorSet = ['#ff0000', '#00ff00', '#0000ff', '#000000'];
				return colorSet[n];
			}
			
			//alphabet system function -- maybe try a char offset?
			function toCharOffset(n)
			{
				//numbers, lowercase, uppercase, greek (lower)
				//numbers: U+0031
				//lowercase low alphabet: U+0061
				//capital low alphabet: U+0041
				//greek: U+03B1
				const offsets = ['\u{0031}', '\u{0061}', '\u{0041}', '\u{03B1}'];
				return offsets[n];
			}
			
			//symbol function -- this should be combined with offset to get the actual symbol shown
			function toSymbolOffset(n)
			{
				return n;
			}
			
			//the main span creation func -- utilizes the utility functions above
			function createSpan(sizePercent, color, alphabetOffset, symbolOffset)
			{
				const style = `style="font-size: ${sizePercent}%; color: ${color};"`;
				const symbol = `${getUnicodeWithOffset(alphabetOffset, parseInt(symbolOffset))}`;
				const result = '<span ' + style + '>' + symbol + '</span>';
				
				return result;
			}
			
			return chunkArray(prePrint, 4)
					.reduce((f, s) => 
								f + createSpan(toSize(s[0]), toColor(s[1]), toCharOffset(s[2]), toSymbolOffset(s[3])),
							'');
		}
		
		shuffleContent = 
			createShuffle(
				l => [...Array(l)].map(x => getCryptoStrongRandomInt(4 ** 4)),
				compose(stringify, rng => decompose(rng, 4)),
				decoratePrePrint);
		
	}
	//colored cubic -- creates a random string of RGB colored characters, each of which represent the pile locations of 3 cards
	//	mod 9, then div 3 = first card's pile
	//	mod 3 is second card's pile
	//	div 9 = color = 3rd card's pile) 
	else if (algorithmName == 'coloredCubic') 
	{
		//some of colored cubic definition goes here -- should probably extract this somewhere else later
		shuffleDocs = 'coloredCubic is a pile-shuffling algorithm that produces 10-character random strings.\n'
					  + 'Each character represents the pile of 3 cards (may choose any order):\n'
					  + '  - One card is put into a pile by taking the size of the character {small, medium, large} \n'
					  + '  - The second card is put into a pile by taking the value of the number {1, 2, 3}\n'
					  + '  - The third card is put into a pile by taking the coolness of the color {red, green, blue}\n'
					  + '  NOTE: an easier way may be to do all of the sizes, then the mods, then the colors\n'
					  + '  POSTSHUFFLE: roll 3 piles * 2 choices = 3! = d6, mod 3, mod 2';
	
		function toColorSpan(n)
		{
			return `${n % 9}${integerDivide(n, 9)}`
		}
		
		function decoratePrePrint(prePrint)
		{
			function createSpan(color, number, sizePercent)
			{
				const span = '<span ' + `style="font-size: ${sizePercent}%; color: ${color};">${number}` + '</span>';
				
				return span;
			}
			
			function toModularValue(n)
			{
				return n % 3;
			}
			
			function toColor(c)
			{
				if (c == 0) { return 'red'; }
				if (c == 1) { return 'green'; }
				return 'blue';
			}
			
			function toSize(n)
			{
				//we know that, for sizes of 2, we want 250% size
				const maxSize = 1000;
				const maxValue = 3;
				const sizeValueRatio = maxSize / maxValue;
				
				//thus, can extrapolate to other sizes
				const nValue = integerDivide(parseInt(n), 3) + 1; //n should be at most 8 => we should get 1, 2, or 3 here 
				const nSize = nValue * sizeValueRatio;
				
				return nSize;
			}
			
			function parsePair(pair)
			{
				const val =
					{ number: toModularValue(parseInt(pair[0])),
					  color: toColor(parseInt(pair[1])),
					  size: toSize(pair[0])
					}; 
					
				return val;
			}
			
			return chunkArray(prePrint, 2)
					.map(parsePair)
					.map((x, i) => [x, i])
					.reduce((f, s) => f + createSpan(s[0].color, s[0].number + 1, s[0].size),
							'');
		}
		
		shuffleContent = 
			createShuffle(
				l => [...Array(l)].map(x => getCryptoStrongRandomInt(3**3)), //3^3 = 27, which is necessary to generate all possible colored values
				toColorSpan,
				decoratePrePrint);
	}
	else //catch-all error case. used if algorithm wasn't recognized
	{
		alert(`ERROR -- ${algorithmName} not a recognized algorithmName`);
		shuffleContent = "###-###-####";
	}
	
	document.getElementById("shuffle").innerHTML = shuffleContent;
	document.getElementById("algorithmDocs").innerText = shuffleDocs;
}

console.log('mtg functions loaded');
