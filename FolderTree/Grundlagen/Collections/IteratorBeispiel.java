import java.util.ArrayList;
import java.util.Iterator;

public class IteratorBeispiel {
    public static void main(String[] args) {
        ArrayList<String> namen = new ArrayList<>();
        namen.add("Ada");
        namen.add("Grace");
        namen.add("Linus");

        Iterator<String> iterator = namen.iterator();
        while (iterator.hasNext()) {
            System.out.println("Name: " + iterator.next());
        }
    }
}
