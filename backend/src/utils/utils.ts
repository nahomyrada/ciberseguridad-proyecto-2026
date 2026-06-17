export function extraerNumeros(texto: string): number[] {
    const regex = /\d+(?:\.\d+)?k?/gi;
    const matches = texto.match(regex) || [];

    return matches.map(match => {
        const esK = match.toLowerCase().includes('k');
        const numero = parseFloat(match);
        return esK ? numero * 1000 : numero;
    });
}

