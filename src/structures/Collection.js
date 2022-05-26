"use strict";

class Collection extends Map {
    constructor(...args) {
        super(...args);
    }
  
    filter(fn) {
        let list = new this.constructor();
      
        for (const [key, value] of this.entries()) {
            if (fn(value, key, this)) {
                list.set(key, value);
            }
        }
      
        return list;
    }
  
    map(fn) {
        let arr = [];
      
        for (const [key, value] of this.values()) {
            arr.push(fn(key, value, this));
        }
      
        return arr;
    }
  
    find(fn) {
        for (const [key, value] of this.entries()) {
            if (fn(value, key, this)) {
                return value;
            }
        }
    }
  
    every(fn) {
        return !!this.find((item, key) => fn(item, key, this));
    }
  
    some(fn) {
        for (const [key, value] of this.entries()) {
            if (fn(value, key, this)) {
                return true;
            }
        }
      
        return false;
    }
  
    random() {
        return [...this.values()][Math.floor(Math.random() * this.size)];
    }
  
    replace(key, value) {
        this.delete(key);
      
        return this.set(key, value);
    }
}

module.exports = Collection;