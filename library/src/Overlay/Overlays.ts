
import { IOverlay } from "./IOverlay";
import { IActionOverlay } from "./IActionOverlay";
import { IAfkOverlay } from "./IAfkOverlay";
import { ITextOverlay } from "./ITextOverlay";
import { EventEmitter } from "events";
/**
 * Class for the base overlay structure 
 */
export class OverlayBase implements IOverlay {
    protected rootElement: HTMLElement;
    protected rootDiv: HTMLElement;
    public textElement: HTMLElement;

    /**
     * Construct an overlay 
     * @param rootDiv the root element this overlay will be inserted into 
     * @param rootElement the root element that is the overlay
     */
    protected constructor(rootDiv: HTMLElement, rootElement: HTMLElement, textElement: HTMLElement) {
        this.rootDiv = rootDiv;
        this.rootElement = rootElement;
        this.textElement = textElement;
        this.rootElement.appendChild(this.textElement);
        this.hide();
        this.rootDiv.appendChild(this.rootElement);
    }

    /**
     * Show the overlay 
     */
    public show(): void {
        this.rootElement.classList.remove("hiddenState");
    }

    /**
     * Hide the overlay
     */
    public hide(): void {
        this.rootElement.classList.add("hiddenState");
    }
}

/**
 * Class for the base action overlay structure 
 */
export class ActionOverlayBase extends OverlayBase implements IActionOverlay {
    eventEmitter: EventEmitter;
    contentElementSpanId: string;

    /**
     * Construct an action overlay 
     * @param rootDiv the root element this overlay will be inserted into 
     * @param rootElement the root element that is the overlay
     * @param contentElement an element that contains text for the action overlay 
     */
    public constructor(rootDiv: HTMLElement, rootElement: HTMLElement, contentElement: HTMLElement, contentElementSpanId?: string) {
        super(rootDiv, rootElement, contentElement);
        this.eventEmitter = new EventEmitter();
        this.contentElementSpanId = contentElementSpanId;
    }

    /**
     * Update the text overlays inner text 
     * @param text the update text to be inserted into the overlay 
     */
    public update(text: string): void {
        if ((text != null || text != undefined) && (this.contentElementSpanId != null || this.contentElementSpanId != undefined)) {
            document.getElementById(this.contentElementSpanId).innerHTML = text;
        }
    }

    /**
     * Set a method as an event emitter callback 
     * @param callBack the method that is to be called when the event is emitted 
     */
    onAction(callBack: (...args: any[]) => void) {
        this.eventEmitter.on("action", callBack);
    }

    /**
     * Activate an event that is attached to the event emitter 
     */
    activate() {
        this.eventEmitter.emit("action");
    }

}

/**
 * Show an overlay for when the session is unattended, it begins a countdown timer, which when elapsed will disconnect the stream.
 */
export class AfkOverlay extends ActionOverlayBase implements IAfkOverlay {
    
    /**
    * @returns The created root element of this overlay.
    */
    public static createRootElement() : HTMLElement {
        const afkOverlayHtml = document.createElement('div');
		afkOverlayHtml.id = "afkOverlay";
		afkOverlayHtml.className = "clickableState";
        return afkOverlayHtml;
    }
    
    /**
     * @returns The created content element of this overlay, which contain some text for an afk count down.
     */
    public static createContentElement() : HTMLElement {
        const afkOverlayHtmlInner = document.createElement('div');
		afkOverlayHtmlInner.id = 'afkOverlayInner';
		afkOverlayHtmlInner.innerHTML = '<center>No activity detected<br>Disconnecting in <span id="afkCountDownNumber"></span> seconds<br>Click to continue<br></center>';
        return afkOverlayHtmlInner;
    }

    /**
     * Construct an Afk overlay 
     * @param parentElement the element this overlay will be inserted into 
     */
    public constructor(rootDiv: HTMLElement) {
        super(rootDiv, AfkOverlay.createRootElement(), AfkOverlay.createContentElement());

        this.rootElement.addEventListener('click', () => {
            this.activate();
        });
    }

    /**
     * Update the count down spans number for the overlay 
     * @param countdown the count down number to be inserted into the span for updating
     */
    public updateCountdown(countdown: number): void {
        document.getElementById("afkCountDownNumber").innerHTML = countdown.toString();
    }

}

/**
 * Overlay shown during disconnection, has a reconnection element that can be clicked to reconnect.
 */
export class DisconnectOverlay extends ActionOverlayBase {

    /**
     * @returns The created root element of this overlay.
     */
    public static createRootElement() : HTMLElement {
        const disconnectOverlayHtml = document.createElement('div');
		disconnectOverlayHtml.id = "disconnectOverlay";
		disconnectOverlayHtml.className = "clickableState";
		return disconnectOverlayHtml;
    }

    /**
     * @returns The created content element of this overlay, which contain whatever content this element contains, like text or a button.
     */
    public static createContentElement() : HTMLElement {
        // build the inner html container 
		const disconnectOverlayHtmlInnerContainer = document.createElement('div');
		disconnectOverlayHtmlInnerContainer.id = 'disconnectButton';

		// build the span that holds error text
		const disconnectOverlayInnerSpan = document.createElement('span');
		disconnectOverlayInnerSpan.id = 'disconnectText';
		disconnectOverlayInnerSpan.innerHTML = 'Click To Restart';

		// build the image element that holds the reconnect element
		const restartSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		restartSvg.setAttribute('width', "40");
		restartSvg.setAttribute('height', "40");
		restartSvg.setAttribute('fill', "currentColor");
		restartSvg.setAttribute('class', "bi bi-arrow-counterclockwise m-2");
		restartSvg.setAttribute('viewBox', "0 0 16 16");

		// build the arrow path 
		const restartSvgPathArrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		restartSvgPathArrow.setAttribute('fill-rule', "evenodd");
		restartSvgPathArrow.setAttribute('d', "M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z");

		// build the circle path
		const restartSvgPathCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		restartSvgPathCircle.setAttribute('d', "M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z");

		// bring it all together
		restartSvg.appendChild(restartSvgPathArrow);
		restartSvg.appendChild(restartSvgPathCircle);

		// append the span and images to the content container 
		disconnectOverlayHtmlInnerContainer.appendChild(disconnectOverlayInnerSpan);
		disconnectOverlayHtmlInnerContainer.appendChild(restartSvg);
        return disconnectOverlayHtmlInnerContainer;
    }

    /**
     * Construct a disconnect overlay with a retry connection icon.
     * @param parentElem the parent element this overlay will be inserted into. 
     */
     public constructor(parentElem: HTMLElement) {
        super(parentElem, DisconnectOverlay.createRootElement(), DisconnectOverlay.createContentElement(), "disconnectText");

		// add the new event listener 
		this.rootElement.addEventListener('click', () => {
            this.activate();
        });
    }

}

/**
 * Overlay shown during connection, has a button that can be clicked to initiate a connection.
 */
export class ConnectOverlay extends ActionOverlayBase {

    /**
    * @returns The created root element of this overlay.
    */
    public static createRootElement() : HTMLElement {
        const connectElem = document.createElement('div');
        connectElem.id = "connectOverlay";
        connectElem.className = "clickableState";
        return connectElem;
    }
    
    /**
     * @returns The created content element of this overlay, which contain whatever content this element contains, like text or a button.
     */
    public static createContentElement() : HTMLElement {
        const connectContentElem = document.createElement('div');
		connectContentElem.id = 'connectButton';
		connectContentElem.innerHTML = 'Click to start';
        return connectContentElem;
    }

    /**
     * Construct a connect overlay with a connection button.
     * @param parentElem the parent element this overlay will be inserted into. 
     */
        public constructor(parentElem: HTMLElement) {
        super(parentElem, ConnectOverlay.createRootElement(), ConnectOverlay.createContentElement());

        // add the new event listener 
        this.rootElement.addEventListener('click', () => {
            this.activate();
        });
    }
}

/**
 * Overlay shown when stream is ready to play.
 */
 export class PlayOverlay extends ActionOverlayBase {

    /**
    * @returns The created root element of this overlay.
    */
    public static createRootElement() : HTMLElement {
        const playElem = document.createElement('div');
        playElem.id = "playOverlay";
        playElem.className = "clickableState";
        return playElem;
    }
    
    /**
     * @returns The created content element of this overlay, which contain whatever content this element contains, like text or a button.
     */
    public static createContentElement() : HTMLElement {
        // todo: change this to an svg
        const playOverlayHtmlInner = document.createElement('img');
		playOverlayHtmlInner.id = 'playButton';
		playOverlayHtmlInner.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPEAAAD5CAYAAAD2mNNkAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMjHxIGmVAAASgklEQVR4Xu2dC7BdVX2HqUCCIRASCPjAFIQREBRBBSRYbFOt8lIrFUWRFqXWsT5wbItUqFWs0KqIMPKoYEWpRS06KDjS1BeVFkVQbCw+wCfiAwGhCKWP9PuZtU24uTe59zz22Y/vm/nGkXtz7jlrr9+sdfZea/03Wb169QtxGW62iYi0D8L7NbwYj8EdcdPyIxFpA4T2P/F/8Ua8CI/GhPnXyq+ISJMhrAlxxX9hRuYL8Sh8SPk1EWkqBHXdEFfcg6vw3fhs3Kb8uog0DQI6XYgr8rOvYsJ8OM4v/0xEmkIJ6ob4P8zIfANegCvQMIs0BQK5sRBXJMy/wIzM5+ByXFBeRkQmBUGcbYjX5S5MmM/AA3CL8nIiUjcEcJAQV9yBX8a/wSeiz5hF6obgDRPikGfMCfOX8DTcu7y0iNQBoRs2xBX/g3diwvwm3Kn8CREZJ4RtVCGuqMKcu9kn4xJ09ZfIuCBgow5xyJ3sTLNzAywrwF6J26NhFhk1BGscIV6XhPluvA6Pxx3KnxaRUUCoxh3iioQ5z5n/BY/FJeUtiMgwEKa6QlyRMN+Hn8Hn4ZblrYjIIBCiukMc8p25Ws6ZMD+zvB0RmSsEaBIhnkrew5V4EHrCiMhcKAFqCv+Nl+J+uBC9my2yMQhKk0Jcke/M78Gsy06YH1TerohMhYA0McQVP8Nz8UDcCl2bLTIVgtHkEFd8D8/E/XFrdGQWqSAQbQhxyKOpm/B03Ac9MkgkEIa2hLgiN78S5lPx0bgIvQEm/YUAtC3EFQnzzfgnuDc6zZZ+Qsdva4jX5Sv4atwXHZmlX9DhuxDikC2Qn8dXYUbmReUjinQbOntXQlyRTRafwldgwrxV+agi3YRO3rUQV/wcV+LL8DHoyZzSTejcXQ1xRc7/uhyzl3kv3Lx8dJFuQKfueohDnjFnZP4o/j7m0ZQH4Es3oDP3IcQV2f6YMF+COZjgUeiZ2dJu6MR9CvG63ILvx4zMCfO80iQi7YLO29cQV3wb34spsr4rumBE2gWdtu8hDln99S1MXeYX4M6leUSaDx3WEK8lRdYT5lR/zPlfnswpzYeOaojXJ4cSfB3Pw+fgtug0W5oJndMQT0/uZGeaXZVyfTZuV5pNpDnQMQ3xxsk0O9Ufz8ZDcdvSfCKThw5piGdP2ioF496JT0c3WcjkKR1T5kYWjCTM78DfQheMyOSgAxriwch35lR/vAbPwOXozS+pHzqeIR6Oal12wvx2fBy6yULqgw5niEdDwpyR+VpMkfXsmHIpp4wfOpohHj234RfwFNwDnWbL+KCDGeLxkJH5p3g1vg53K00uMlroXIZ4vGTBSMJ8FeZkzmWl6UVGA53KENfD/ZiyNCmynvO/FpdLIDIcdCZDXC8ZmfOd+d/wJejZXzIcdCJDXD95xpwjdnP+V74zH4Wu/pLBoPMY4smSMN+FKbJ+BBpmmRt0GkPcDBLmu/FjeAi6lFNmB53FEDeHTLPzaCoj80dwBfqMWTYMncQQN5esAPsw7lcul8j60EEMcfPJDbD3YU7l3KxcOpE10CkMcTvIVDvfmc/E3XELtPqjGOKWkhVgp+GemDD7vbnP0AEMcXtJkfU34GNxAToy9xEuvCFuP6vwJMyOqYXl0kpf4KIb4m5QncyZTRapZGGY+wIX2xB3i3vxOswmi13QaXbX4QIb4m6SY3a/iMdh7mYb5q7ChTXE3aXaaLESq7rMW5ZLL12Bi2qI+8E9eDkmzLuhYe4KXExD3B8yMt+Ol+KL0CLrXYCLaIj7R8J8K16CR6PLOdsMF88Q95fsmPoRXozPxdzNdvVX2+CiGWLJza+EOXWZj8Sd0APw2wIXyxBLqPYy34LnY8K8DA1z0+EiGWKZSgJ9I74LU2R9R3Sa3VS4OIZYZqJaynkWpsj6w0u3kSbBhTHEsjHuwxswpVwPw6Wl+0gT4IIYYpkNmWKnr1yPqf54KG5VupFMknJhRGZLwpzVX6n++DZ8GrpjapJwAQyxDELCnB1TqWTx1/gUdGSeBDS8IZZBSZBjzv76PP4VHoSGuU5ocEMsoyBhTsG4VH98Ix6A80s3k3FCQxtiGSVZMPIT/CwmzPuhz5jHCQ1siGUcZClnwvxpPAX3LF1ORg2Na4hlXGSKnQUjCfNn8PX4CNy0dD8ZBTSoIZZxkzBXI/Pn8ATMumzDPApoSEMsdZEw5zvzDzHT7JdjwuzZX8NAAxpimQSZZifMn8Tj8aGlS8pcofEMsUyKjMw5lTOnjHwcc2TQktI1ZbbQaIZYJk3CnE0WGZmvwOeh+5hnC41liKUpVCNzwvwJPBy9+bUxaCRDLE0jYb4fU/0x0+yD8cGly8pUaBxDLE0kQa7CfCfmML8D0SN2p0KjGGJpOglztWgkh/k9CT1it4LGMMTSFhLmLBrJ3exzcJ/SjfsNDWGIpY0k0D/AM/GRpTv3ExrAEEubqVaAnY5LsX93s/nQhli6QLUF8nWYI3bnYT+Wc/JBDbF0heqO9jfwlfhInI/dDjMf0BBLF0mYr8NsskiNqS2wm2Hmgxli6TJ5zpwjg/4Qd8buLRrhQxli6QM5ZjdHBh2H+c7cnUUjfBhDLH0hU+y7cCU+H7OXeV6JQnvhQxhi6RsJc0bmy/BZ+MsbYCUS7YM3b4ilryTM2QL5QUzBuHxnbt80mzdtiEVWr74NL8KUck2R9faMzLxZQyyyhozMWcp5If4uJszNP5yAN2mIRR5IVn/djOfhEdjsw/x4c4ZYZHryjPkmPBsPwYeV2DQL3pghFpmZTLFzZFDCnLrMz8DtsTkbLXgzhlhk4yTM2cu8CrNjKiNzwjz5OlO8CUMsMjcS5qzLfgumyPr2JU6TgTdgiEUGoyqynrrMv42TOTObP2yIRQYn0+ws5bwaU8r1N3HrEq964A8aYpHhSZjvwBSMS5gPwnrWZfOHDLHI6Mgz5hyxm4Jxf4kH4HjDzB8wxCKjJ2HONPuf8c9xHxzPXmZe2BCLjIdMsWMqWfwTnoiPwdGOzLygIRYZPwlzVWPqtbgXjmbBCC9kiEXqI8+Ys8nicnwN7laiODi8iCEWqZeMylmXnTCnYFxO5tyxRHLu8I8NschkSJizLvv7mJH5pbgY57Zjin9giEUmSzUyfw9TZP1Y3LZEdOPwy4ZYpBkkzKn++B38KB6F25Wozgy/ZIhFmkXCnLO/vosfwpwysqhEdn34oSEWaSYJ8y8w0+wP4GG4/oIR/qMhFmk2VZgzzU6Ys2Nq7T5m/o8hFmkHCXO2PybMF+O++CBDLNIuEuSsy8535lvxZEMs0j6qWszZJbXUEIu0i1vwrZhqFZv5nVikPWTqfA5mF9QDD+fjPxhikeaR777xdrwAn1Aiuz780BCLNIvsdMqBAqkNtRw3XBeKXzDEIpMno27Cezdeik/GBSWmG4ZfNMQikyPhzXrpVGXM6R8rcG7lVfkHhlikfhLe7FzKo6KV+Hu45m7zXOEfGmKReske4oT3k3gMblniOBi8gCEWqYeMvD/GK/F43KHEcDh4IUMsMl5yw+pHmLOoX4aDH8UzHbygIRYZD/nem5H3KjwBd8LRV1HkRQ2xyGjJ3eacNZ1iayfhr+P46hnz4oZYZDRk2pzwph7TX+CuOP76xfwRQywyHNlVVIX3VHx8iVc98AcNscjgZJFGypq+GffHwZ71DgN/1BCLzJ2f47/iWzBlTId71jsM/HFDLDI7crf5HrwG34YHY70FxaeDN2GIRTZMwpvjcK7Fd+BTcfLhreDNGGKRmcnIez2+Ew/FhTi3MivjhjdkiEXWJ0fEfhXPwmfi4hKZ5sGbM8Qia8n65lX4LkzlhYeVqDQX3qQhFlnzrPc/8FzMtsBl2Kxp80zwRg2x9J0cxn4epoBZlkjW/6x3GHjDhlj6SJZI5gTJ9+DzMeHdvMSiXfDGDbH0iWpbYMqgJLy7YLtG3qnwAQyx9IVsC7wEX4C74/h2FtUJH8QQS9fJUTg5QfI43APnle7fDfhAhli6So5//Ri+GBPeya1vHid8MEMsXSMH0X0CX4J74cLS3bsJH9AQS1fITavs6f1VeLEdz3qHgQ9piKXtZHNC1jfnELpfTpux++Gt4MMaYmkrmTZ/GV+LCW+3p80zwQc3xNI2skTyBswhdHtic7YFTgIawBBLm7gRT8HH4dbYn2nzTNAIhljaQCrkvwkT3tywGv8pkm2BxjDE0lRyokbOsjoDUyE/N6wM71RoFEMsTSPhvRPfjY/GBei0eSZoHEMsTeJ2/ADug+3cVVQ3NJQhliaQkfcf8SnoqDsXaDBDLJMij4ruxcvwaejIOwg0nCGWusnyyIT3CjwM+7lIY1TQgIZY6iA3qzLyZmdRSn0eic09QbJN0JCGWMZJwpuR9w78Er4Qu7klcFLQoIZYxkXq9OZuc2oWZXNCv5dHjgsa1hDLqKnCm2qB2Zzw0NLdZBzQwIZYRkWmzT/DhPdE3KV0MxknNLQhlmHJ996ENwXHsjkhq6xcHlkXNLYhlkFJeHPDKhvyszkh4W338a9thEY3xDJX8qgoGxMS3tTpfSzOL11K6obGN8QyWxLeLI/MtDmlPvdHp82ThotgiGU2ZOStwrsCXSLZFLgYhlg2xF2Yc6zOxqejCzWaBhfFEMt0pMj2VzB1eg/BJaXLSNPg4hhiqcjd5izUSIX8lPp8Fi4tXUWaChfJEEtIhfwU2b4QU2R7O3RfbxvgQhnifpOD17+JCW9KfS5F7zi3CS6YIe4nOXj9W/h3eAw+vHQJaRtcPEPcL/Ks92a8CI/FXdFpc5vhAhri/vB9/Hv8A3wUukSyC3AhDXH3+Sn+Ax6PqZDvEskuwQU1xN2kOgonJ0im1Gc2J2xRLrt0CS6sIe4W1c6ij2NG3lROmFcut3QRLrAh7g4J75X4R7g3Gt4+wIU2xO0n0+ZP4aswBcdc39wnuOCGuL3kWe/n8DW4Ly4ql1X6BBfeELeTL+AJ+ATcBn3W21e4+Ia4PeSO89fwT/GJuAhdItl36ASGuPlkZ9G38fWYo3Ay8hpeWQOdwRA3lxwBexO+GVPq07Insj50DEPcTLK++e2Yc6wWo995ZXroHIa4WdyKOQpnOWbavGm5VCLTQycxxM0gp0iej0/G3LAyvDI76CyGeHJUx+G8Hw9Ewytzh05jiCdDDqK7HA/Aheh3XhkMOo8hrpe096fxd9D9vDI8pVPJ+LkXP4vPQafMMjroUIZ4fOQ7b9Y3X4U5x8oi2zJ66FiGePRkeWROkfwiHoee3Szjgw5miEdDRt14D+bw9ZfjDqWZRcYHHc0QD091FE6OgP0z9OB1qQ86myEenKxtTngz8r4BHXmlfuh4hnjuJLwp9Zlqgafh7qU5ReqHDmiIZ0+mzVkeeQO+FR9fmlFkctARDfHsSJ3ef8dqZ5GH0EkzoDMa4pnJ3ea0T07TOAezvnlBaTqRZlA6qTyQhDdrm1fhBXgwGl5pJnROQ7yW6jlvwvtefAZuXppKpJmUTitrp80p9Zn1zQ8uTSTSbOisfQ9xps2pkJ/wPhe3K00j0g7otH0N8f34dXwfHo0W2ZZ2QuftY4izPDKnabwIH4Ee/yrthQ7clxBnldUP8BJ8MSa87uuV9kNH7nqIc4ZVwvshfCkuQ8Mr3YEO3dUQZ4nkD/HDmFKfe5SPLNIt6NxdDHHC+xF8BabsiSOvdBc6eJdCfBtehglvimz7rFe6Dx29CyHOQo0r8NWYOr0W2Zb+QIdva4izRDLPeldi6vSm1OfC8rFE+gMdv40hznu+GlMhfz/cEj0OR/oJnb9NIc57vQZPxCehI69ICUbTydnN1+LJmPAuKW9fRAhEk0OcZ73XYw6hOwg9v1lkKgSjqSHO5oRT8TdwKbq+WWQ6CEeTQpw7zlmocTqmTm/Ob7bomMiGICRNCHGmzT/BszClPjPyuspKZDYQlkmH+Mf4t7gct0enzSJzgdBMKsQJ70X4VHTkFRkUwlN3iFM54YN4KG6LHkQnMgyEqK4Q51nvpZjwZuQ1vCKjgDDVEeIr8XBMeL3bLDJKCNW4QpyR9zo8ArdBb1iJjAPCNeoQJ7ypFngszkc3JoiME0I2qhDnWW8Kjv0xujFBpC4I3DAhzgqrHESXUp/Z0/uQ8rIiUhcEb5AQJ7z34TfwJNy5vJyI1A0BnG2IE9yYsiffwTfizuh3XpFJQghnE+J83014v4upkL8r+qhIpAkQxg2FOOHNzzNtPhf3REdekSZRQjqVTJtzguSNeD4eWH5dRJoGAZ0a4rvxm3ghrkCnzSJNhpBWIc7/plpgwpudRZ7dLNIGCOvtJbwX42G4uPxIRNoAoU2d3iNxUflPItIaNtnk/wEGBoMdpECGHAAAAABJRU5ErkJggg==";
		playOverlayHtmlInner.alt = 'Start Streaming';
        return playOverlayHtmlInner;
    }

    /**
     * Construct a connect overlay with a connection button.
     * @param parentElem the parent element this overlay will be inserted into. 
     */
        public constructor(parentElem: HTMLElement) {
        super(parentElem, PlayOverlay.createRootElement(), PlayOverlay.createContentElement());

        // add the new event listener 
        this.rootElement.addEventListener('click', () => {
            this.activate();
        });
    }

}

/**
 * Class for the text overlay base 
 */
export class TextOverlayBase extends OverlayBase implements ITextOverlay {

    /**
     * Construct a text overlay 
     * @param rootDiv the root element this overlay will be inserted into 
     * @param rootElement the root element that is the overlay
     * @param textElement an element that contains text for the action overlay  
     */
    public constructor(rootDiv: HTMLElement, rootElement: HTMLElement, textElement: HTMLElement) {
        super(rootDiv, rootElement, textElement);
    }

    /**
     * Update the text overlays inner text 
     * @param text the update text to be inserted into the overlay 
     */
    public update(text: string): void {
        if (text != null || text != undefined) {
            this.textElement.innerHTML = text;
        }
    }
}

/**
 * Generic overlay used to show textual info to the user.
 */
 export class InfoOverlay extends TextOverlayBase {

    /**
    * @returns The created root element of this overlay.
    */
    public static createRootElement() : HTMLElement {
        const infoOverlayHtml = document.createElement('div');
		infoOverlayHtml.id = "infoOverlay";
		infoOverlayHtml.className = "textDisplayState";
        return infoOverlayHtml;
    }
    
    /**
     * @returns The created content element of this overlay, which contain whatever content this element contains, like text or a button.
     */
    public static createContentElement() : HTMLElement {
        const infoOverlayHtmlInner = document.createElement('div');
		infoOverlayHtmlInner.id = 'messageOverlayInner';
        return infoOverlayHtmlInner;
    }

    /**
     * Construct a connect overlay with a connection button.
     * @param parentElem the parent element this overlay will be inserted into. 
     */
        public constructor(parentElem: HTMLElement) {
        super(parentElem, InfoOverlay.createRootElement(), InfoOverlay.createContentElement());
    }
}

/**
 * Generic overlay used to show textual error info to the user.
 */
 export class ErrorOverlay extends TextOverlayBase {

    /**
    * @returns The created root element of this overlay.
    */
    public static createRootElement() : HTMLElement {
        const errorOverlayHtml = document.createElement('div');
		errorOverlayHtml.id = "errorOverlay";
		errorOverlayHtml.className = "textDisplayState";
        return errorOverlayHtml;
    }
    
    /**
     * @returns The created content element of this overlay, which contain whatever content this element contains, like text or a button.
     */
    public static createContentElement() : HTMLElement {
        const errorOverlayHtmlInner = document.createElement('div');
		errorOverlayHtmlInner.id = 'errorOverlayInner';
        return errorOverlayHtmlInner;
    }

    /**
     * Construct a connect overlay with a connection button.
     * @param parentElem the parent element this overlay will be inserted into. 
     */
    public constructor(parentElem: HTMLElement) {
        super(parentElem, ErrorOverlay.createRootElement(), ErrorOverlay.createContentElement());
    }
}