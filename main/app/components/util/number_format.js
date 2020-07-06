/**
 * Formatea un número para mostrar la cantidad de puntos decimales deseados.
 * 
 * @param {Number} value El número o valor a ser formateado.
 * @param {Number} n La cantidad de puntos decimales a mostrar.
 * @returns {String} Una cadena que contiene el valor proporcionado con el formato aplicado.
 */
export function toFixedTrunc(value, n) {
    const v = value.toString().split('.');
    if (n <= 0) return v[0];
    let f = v[1] || '';
    if (f.length > n) return `${v[0]}.${f.substr(0, n)}`;
    while (f.length < n) f += '0';
    return `${v[0]}.${f}`;
}