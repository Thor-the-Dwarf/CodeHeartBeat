import java.util.LinkedList;

public class LinkedListBeispiel {
    public static void main(String[] args) {
        LinkedList<String> aufgaben = new LinkedList<>();
        aufgaben.add("Planen");
        aufgaben.addFirst("Analysieren");
        aufgaben.addLast("Testen");

        System.out.println("Erste Aufgabe: " + aufgaben.getFirst());
        System.out.println("Letzte Aufgabe: " + aufgaben.getLast());
    }
}
