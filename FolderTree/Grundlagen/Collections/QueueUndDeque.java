import java.util.ArrayDeque;
import java.util.Deque;

public class QueueUndDeque {
    public static void main(String[] args) {
        Deque<String> warteschlange = new ArrayDeque<>();
        warteschlange.offerLast("Ticket A");
        warteschlange.offerLast("Ticket B");
        warteschlange.offerFirst("Dringendes Ticket");

        System.out.println("Bearbeitet: " + warteschlange.pollFirst());
        System.out.println("Als Nächstes: " + warteschlange.peekFirst());
    }
}
